import {
  CustomerJob,
  Quote,
  PricingItem,
  ContentIdea,
  AppSettings,
  BookingImportPayload,
} from "./types";
import { generateId } from "./utils";
import { getAdapter } from "./adapters";

// ---------------------------------------------------------------------------
// Adapter instance — use *Async exports when migrating pages to Supabase.
// Sync exports below use localStorage directly for backward compatibility.
// ---------------------------------------------------------------------------

export const adapter = getAdapter();

// ---------------------------------------------------------------------------
// localStorage keys (used by sync functions)
// ---------------------------------------------------------------------------

const KEYS = {
  jobs: "nordic-ops-jobs",
  quotes: "nordic-ops-quotes",
  pricing: "nordic-ops-pricing",
  content: "nordic-ops-content",
  settings: "nordic-ops-settings",
} as const;

function get<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ===== SYNC FUNCTIONS (localStorage — current app uses these) ==============

// --- Jobs ---

export function getJobs(): CustomerJob[] {
  return get<CustomerJob>(KEYS.jobs);
}

export function getJob(id: string): CustomerJob | undefined {
  return getJobs().find((j) => j.id === id);
}

export function saveJob(job: CustomerJob): void {
  const jobs = getJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.unshift(job);
  set(KEYS.jobs, jobs);
}

export function deleteJob(id: string): void {
  set(
    KEYS.jobs,
    getJobs().filter((j) => j.id !== id)
  );
}

export function createCustomerJob(data: Partial<CustomerJob>): CustomerJob {
  const job: CustomerJob = {
    id: generateId(),
    customerName: data.customerName || "",
    phone: data.phone || "",
    email: data.email || "",
    vehicleType: data.vehicleType || "",
    brandModel: data.brandModel || "",
    problem: data.problem || "",
    internalNotes: data.internalNotes || "",
    status: data.status || "Ny",
    price: data.price || 0,
    paymentStatus: data.paymentStatus || "Ej betald",
    source: data.source || "Walk-in",
    nextStep: data.nextStep || "",
    createdAt: data.createdAt || new Date().toISOString(),
    preferredDate: data.preferredDate || "",
    pickupDelivery: data.pickupDelivery || "",
    campaignCode: data.campaignCode || "",
  };
  saveJob(job);
  return job;
}

export function updateJobStatus(
  id: string,
  status: CustomerJob["status"]
): void {
  const job = getJob(id);
  if (job) {
    job.status = status;
    saveJob(job);
  }
}

export function updatePaymentStatus(
  id: string,
  paymentStatus: CustomerJob["paymentStatus"]
): void {
  const job = getJob(id);
  if (job) {
    job.paymentStatus = paymentStatus;
    saveJob(job);
  }
}

// --- Booking Import ---

export function mapBookingPayloadToCustomerJob(
  payload: BookingImportPayload
): Partial<CustomerJob> {
  return {
    customerName: payload.customerName,
    phone: payload.phone,
    email: payload.email,
    vehicleType: payload.vehicleType,
    brandModel: payload.brandModel,
    problem: payload.problem,
    preferredDate: payload.preferredDate,
    pickupDelivery: payload.pickupDelivery,
    campaignCode: payload.campaignCode,
    internalNotes: payload.notes,
    source: payload.source || "Website",
    status: "Ny",
    paymentStatus: "Ej betald",
    nextStep: "Bekräfta bokning",
  };
}

export function importBooking(payload: BookingImportPayload): CustomerJob {
  const jobData = mapBookingPayloadToCustomerJob(payload);
  return createCustomerJob(jobData);
}

// --- Quotes ---

export function getQuotes(): Quote[] {
  return get<Quote>(KEYS.quotes);
}

export function saveQuote(quote: Quote): void {
  const quotes = getQuotes();
  const idx = quotes.findIndex((q) => q.id === quote.id);
  if (idx >= 0) quotes[idx] = quote;
  else quotes.unshift(quote);
  set(KEYS.quotes, quotes);
}

export function deleteQuote(id: string): void {
  set(
    KEYS.quotes,
    getQuotes().filter((q) => q.id !== id)
  );
}

// --- Pricing ---

export function getPricing(): PricingItem[] {
  return get<PricingItem>(KEYS.pricing);
}

export function savePricingItem(item: PricingItem): void {
  const items = getPricing();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  set(KEYS.pricing, items);
}

export function deletePricingItem(id: string): void {
  set(
    KEYS.pricing,
    getPricing().filter((i) => i.id !== id)
  );
}

// --- Content Ideas ---

export function getContentIdeas(): ContentIdea[] {
  return get<ContentIdea>(KEYS.content);
}

export function saveContentIdea(idea: ContentIdea): void {
  const ideas = getContentIdeas();
  const idx = ideas.findIndex((i) => i.id === idea.id);
  if (idx >= 0) ideas[idx] = idea;
  else ideas.unshift(idea);
  set(KEYS.content, ideas);
}

export function deleteContentIdea(id: string): void {
  set(
    KEYS.content,
    getContentIdeas().filter((i) => i.id !== id)
  );
}

// --- Settings ---

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Nordic E-Mobility",
  phone: "",
  email: "",
  address: "",
  defaultDiscount: 0,
  defaultPickupFee: 299,
  accentColor: "#4ade80",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const data = localStorage.getItem(KEYS.settings);
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// --- Export / Import All Data ---

export function exportAllData(): string {
  return JSON.stringify(
    {
      jobs: getJobs(),
      quotes: getQuotes(),
      pricing: getPricing(),
      content: getContentIdeas(),
      settings: getSettings(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAllData(json: string): void {
  const data = JSON.parse(json);
  if (data.jobs) set(KEYS.jobs, data.jobs);
  if (data.quotes) set(KEYS.quotes, data.quotes);
  if (data.pricing) set(KEYS.pricing, data.pricing);
  if (data.content) set(KEYS.content, data.content);
  if (data.settings) saveSettings(data.settings);
}

// ===== ASYNC FUNCTIONS (adapter — use when migrating to Supabase) ==========

export const getJobsAsync = () => adapter.getJobs();
export const getJobAsync = (id: string) => adapter.getJob(id);
export const saveJobAsync = (job: CustomerJob) => adapter.saveJob(job);
export const deleteJobAsync = (id: string) => adapter.deleteJob(id);

export const getQuotesAsync = () => adapter.getQuotes();
export const saveQuoteAsync = (quote: Quote) => adapter.saveQuote(quote);
export const deleteQuoteAsync = (id: string) => adapter.deleteQuote(id);

export const getPricingAsync = () => adapter.getPricing();
export const savePricingItemAsync = (item: PricingItem) => adapter.savePricingItem(item);
export const deletePricingItemAsync = (id: string) => adapter.deletePricingItem(id);

export const getContentIdeasAsync = () => adapter.getContentIdeas();
export const saveContentIdeaAsync = (idea: ContentIdea) => adapter.saveContentIdea(idea);
export const deleteContentIdeaAsync = (id: string) => adapter.deleteContentIdea(id);

export const getSettingsAsync = () => adapter.getSettings();
export const saveSettingsAsync = (s: AppSettings) => adapter.saveSettings(s);

export const exportAllDataAsync = () => adapter.exportAllData();
export const importAllDataAsync = (json: string) => adapter.importAllData(json);

export async function createCustomerJobAsync(
  data: Partial<CustomerJob>
): Promise<CustomerJob> {
  const job: CustomerJob = {
    id: generateId(),
    customerName: data.customerName || "",
    phone: data.phone || "",
    email: data.email || "",
    vehicleType: data.vehicleType || "",
    brandModel: data.brandModel || "",
    problem: data.problem || "",
    internalNotes: data.internalNotes || "",
    status: data.status || "Ny",
    price: data.price || 0,
    paymentStatus: data.paymentStatus || "Ej betald",
    source: data.source || "Walk-in",
    nextStep: data.nextStep || "",
    createdAt: data.createdAt || new Date().toISOString(),
    preferredDate: data.preferredDate || "",
    pickupDelivery: data.pickupDelivery || "",
    campaignCode: data.campaignCode || "",
  };
  await adapter.saveJob(job);
  return job;
}

export async function importBookingAsync(
  payload: BookingImportPayload
): Promise<CustomerJob> {
  const jobData = mapBookingPayloadToCustomerJob(payload);
  return createCustomerJobAsync(jobData);
}
