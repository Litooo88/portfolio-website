import {
  CustomerJob,
  Quote,
  PricingItem,
  ContentIdea,
  AppSettings,
} from "../types";
import { StorageAdapter } from "../storage-adapter";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEYS = {
  jobs: "nordic-ops-jobs",
  quotes: "nordic-ops-quotes",
  pricing: "nordic-ops-pricing",
  content: "nordic-ops-content",
  settings: "nordic-ops-settings",
} as const;

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Nordic E-Mobility",
  phone: "",
  email: "",
  address: "",
  defaultDiscount: 0,
  defaultPickupFee: 299,
  accentColor: "#4ade80",
};

// ---------------------------------------------------------------------------
// Internal helpers (synchronous)
// ---------------------------------------------------------------------------

function lsGet<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(key);
  return data ? (JSON.parse(data) as T[]) : [];
}

function lsSet<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// LocalStorageAdapter
// ---------------------------------------------------------------------------

/**
 * Implements StorageAdapter using the browser's localStorage.
 * All operations are synchronous under the hood but return Promises so the
 * class satisfies the async StorageAdapter interface.
 */
export class LocalStorageAdapter implements StorageAdapter {
  // --- Jobs ---

  async getJobs(): Promise<CustomerJob[]> {
    return lsGet<CustomerJob>(KEYS.jobs);
  }

  async getJob(id: string): Promise<CustomerJob | undefined> {
    return lsGet<CustomerJob>(KEYS.jobs).find((j) => j.id === id);
  }

  async saveJob(job: CustomerJob): Promise<void> {
    const jobs = lsGet<CustomerJob>(KEYS.jobs);
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) jobs[idx] = job;
    else jobs.unshift(job);
    lsSet(KEYS.jobs, jobs);
  }

  async deleteJob(id: string): Promise<void> {
    lsSet(
      KEYS.jobs,
      lsGet<CustomerJob>(KEYS.jobs).filter((j) => j.id !== id)
    );
  }

  // --- Quotes ---

  async getQuotes(): Promise<Quote[]> {
    return lsGet<Quote>(KEYS.quotes);
  }

  async saveQuote(quote: Quote): Promise<void> {
    const quotes = lsGet<Quote>(KEYS.quotes);
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx >= 0) quotes[idx] = quote;
    else quotes.unshift(quote);
    lsSet(KEYS.quotes, quotes);
  }

  async deleteQuote(id: string): Promise<void> {
    lsSet(
      KEYS.quotes,
      lsGet<Quote>(KEYS.quotes).filter((q) => q.id !== id)
    );
  }

  // --- Pricing ---

  async getPricing(): Promise<PricingItem[]> {
    return lsGet<PricingItem>(KEYS.pricing);
  }

  async savePricingItem(item: PricingItem): Promise<void> {
    const items = lsGet<PricingItem>(KEYS.pricing);
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    lsSet(KEYS.pricing, items);
  }

  async deletePricingItem(id: string): Promise<void> {
    lsSet(
      KEYS.pricing,
      lsGet<PricingItem>(KEYS.pricing).filter((i) => i.id !== id)
    );
  }

  // --- Content Ideas ---

  async getContentIdeas(): Promise<ContentIdea[]> {
    return lsGet<ContentIdea>(KEYS.content);
  }

  async saveContentIdea(idea: ContentIdea): Promise<void> {
    const ideas = lsGet<ContentIdea>(KEYS.content);
    const idx = ideas.findIndex((i) => i.id === idea.id);
    if (idx >= 0) ideas[idx] = idea;
    else ideas.unshift(idea);
    lsSet(KEYS.content, ideas);
  }

  async deleteContentIdea(id: string): Promise<void> {
    lsSet(
      KEYS.content,
      lsGet<ContentIdea>(KEYS.content).filter((i) => i.id !== id)
    );
  }

  // --- Settings ---

  async getSettings(): Promise<AppSettings> {
    if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
    const data = localStorage.getItem(KEYS.settings);
    return data
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(data) as Partial<AppSettings>) }
      : { ...DEFAULT_SETTINGS };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  }

  // --- Bulk ---

  async exportAllData(): Promise<string> {
    return JSON.stringify(
      {
        jobs: lsGet<CustomerJob>(KEYS.jobs),
        quotes: lsGet<Quote>(KEYS.quotes),
        pricing: lsGet<PricingItem>(KEYS.pricing),
        content: lsGet<ContentIdea>(KEYS.content),
        settings: await this.getSettings(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  async importAllData(json: string): Promise<void> {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (data.jobs) lsSet(KEYS.jobs, data.jobs as CustomerJob[]);
    if (data.quotes) lsSet(KEYS.quotes, data.quotes as Quote[]);
    if (data.pricing) lsSet(KEYS.pricing, data.pricing as PricingItem[]);
    if (data.content) lsSet(KEYS.content, data.content as ContentIdea[]);
    if (data.settings)
      await this.saveSettings(data.settings as AppSettings);
  }
}
