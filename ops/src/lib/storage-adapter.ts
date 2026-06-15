import {
  CustomerJob,
  Quote,
  PricingItem,
  ContentIdea,
  AppSettings,
} from "./types";

/**
 * StorageAdapter — the contract every storage backend must satisfy.
 *
 * All methods are async so that remote backends (Supabase, etc.) can fulfil
 * them naturally. The LocalStorageAdapter wraps synchronous calls in
 * Promise.resolve() for interface compatibility.
 */
export interface StorageAdapter {
  // --- Jobs ---
  getJobs(): Promise<CustomerJob[]>;
  getJob(id: string): Promise<CustomerJob | undefined>;
  saveJob(job: CustomerJob): Promise<void>;
  deleteJob(id: string): Promise<void>;

  // --- Quotes ---
  getQuotes(): Promise<Quote[]>;
  saveQuote(quote: Quote): Promise<void>;
  deleteQuote(id: string): Promise<void>;

  // --- Pricing ---
  getPricing(): Promise<PricingItem[]>;
  savePricingItem(item: PricingItem): Promise<void>;
  deletePricingItem(id: string): Promise<void>;

  // --- Content Ideas ---
  getContentIdeas(): Promise<ContentIdea[]>;
  saveContentIdea(idea: ContentIdea): Promise<void>;
  deleteContentIdea(id: string): Promise<void>;

  // --- Settings ---
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // --- Bulk ---
  exportAllData(): Promise<string>;
  importAllData(json: string): Promise<void>;
}
