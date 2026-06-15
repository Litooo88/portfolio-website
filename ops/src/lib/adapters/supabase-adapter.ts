/**
 * SupabaseAdapter
 *
 * REQUIREMENTS:
 *   - npm install @supabase/supabase-js
 *   - NEXT_PUBLIC_SUPABASE_URL env var set
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY env var set
 *   - A running Supabase instance with the schema described below
 *
 * DATABASE SCHEMA (Supabase / PostgreSQL):
 *
 *   customers          — id, name, phone, email
 *   service_cases      — id, customer_id (FK), vehicle_type, brand_model,
 *                        problem, internal_notes, status, price,
 *                        payment_status, source, next_step, created_at,
 *                        preferred_date, pickup_delivery, campaign_code
 *   quotes             — id, job_id, customer_name, diagnostics,
 *                        repair_labor, extra_work, pickup_delivery,
 *                        discount, notes, created_at
 *   quote_parts        — id, quote_id (FK), name, price
 *   price_rules        — id, service, category, standard_price,
 *                        min_price, premium_price, note
 *   content_ideas      — id, title, type, notes, status, hook,
 *                        problem, solution, result, cta, created_at
 *   app_settings       — id (always 1), company_name, phone, email,
 *                        address, default_discount, default_pickup_fee,
 *                        accent_color
 *
 * The @supabase/supabase-js import is lazy (dynamic) so that the build does
 * not fail when the package is not yet installed.
 */

import {
  CustomerJob,
  Quote,
  QuotePart,
  PricingItem,
  ContentIdea,
  AppSettings,
  JobStatus,
  PaymentStatus,
  JobSource,
  ContentType,
  ContentStatus,
} from "../types";
import { StorageAdapter } from "../storage-adapter";
import { DEFAULT_SETTINGS } from "./local-storage-adapter";

// ---------------------------------------------------------------------------
// Lazy Supabase client — avoids hard build-time dependency
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: any = null;

async function getClient() {
  if (_supabase) return _supabase;

  // Dynamic import — only resolved when SupabaseAdapter is actually used.
  // The package must be installed: npm install @supabase/supabase-js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createClient } = await import(/* webpackIgnore: true */ "@supabase/supabase-js" as any);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "SupabaseAdapter: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// ---------------------------------------------------------------------------
// Row → domain-model mappers
// ---------------------------------------------------------------------------

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface ServiceCaseRow {
  id: string;
  customer_id: string;
  vehicle_type: string;
  brand_model: string;
  problem: string;
  internal_notes: string;
  status: string;
  price: number;
  payment_status: string;
  source: string;
  next_step: string;
  created_at: string;
  preferred_date: string;
  pickup_delivery: string;
  campaign_code: string;
  customers: CustomerRow;
}

function rowToCustomerJob(row: ServiceCaseRow): CustomerJob {
  return {
    id: row.id,
    customerName: row.customers?.name ?? "",
    phone: row.customers?.phone ?? "",
    email: row.customers?.email ?? "",
    vehicleType: row.vehicle_type,
    brandModel: row.brand_model,
    problem: row.problem,
    internalNotes: row.internal_notes,
    status: row.status as JobStatus,
    price: row.price,
    paymentStatus: row.payment_status as PaymentStatus,
    source: row.source as JobSource,
    nextStep: row.next_step,
    createdAt: row.created_at,
    preferredDate: row.preferred_date,
    pickupDelivery: row.pickup_delivery,
    campaignCode: row.campaign_code,
  };
}

interface QuoteRow {
  id: string;
  job_id: string;
  customer_name: string;
  diagnostics: number;
  repair_labor: number;
  extra_work: number;
  pickup_delivery: number;
  discount: number;
  notes: string;
  created_at: string;
  quote_parts: Array<{ name: string; price: number }>;
}

function rowToQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    jobId: row.job_id,
    customerName: row.customer_name,
    diagnostics: row.diagnostics,
    repairLabor: row.repair_labor,
    extraWork: row.extra_work,
    parts: (row.quote_parts ?? []) as QuotePart[],
    pickupDelivery: row.pickup_delivery,
    discount: row.discount,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

interface PriceRuleRow {
  id: string;
  service: string;
  category: string;
  standard_price: number;
  min_price: number;
  premium_price: number;
  note: string;
}

function rowToPricingItem(row: PriceRuleRow): PricingItem {
  return {
    id: row.id,
    service: row.service,
    category: row.category,
    standardPrice: row.standard_price,
    minPrice: row.min_price,
    premiumPrice: row.premium_price,
    note: row.note,
  };
}

interface ContentIdeaRow {
  id: string;
  title: string;
  type: string;
  notes: string;
  status: string;
  hook: string;
  problem: string;
  solution: string;
  result: string;
  cta: string;
  created_at: string;
}

function rowToContentIdea(row: ContentIdeaRow): ContentIdea {
  return {
    id: row.id,
    title: row.title,
    type: row.type as ContentType,
    notes: row.notes,
    status: row.status as ContentStatus,
    hook: row.hook,
    problem: row.problem,
    solution: row.solution,
    result: row.result,
    cta: row.cta,
    createdAt: row.created_at,
  };
}

interface AppSettingsRow {
  id: number;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  default_discount: number;
  default_pickup_fee: number;
  accent_color: string;
}

function rowToAppSettings(row: AppSettingsRow): AppSettings {
  return {
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    defaultDiscount: row.default_discount,
    defaultPickupFee: row.default_pickup_fee,
    accentColor: row.accent_color,
  };
}

// ---------------------------------------------------------------------------
// SupabaseAdapter
// ---------------------------------------------------------------------------

export class SupabaseAdapter implements StorageAdapter {
  // --- Jobs ---

  async getJobs(): Promise<CustomerJob[]> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("service_cases")
        .select("*, customers(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[SupabaseAdapter] getJobs error:", error);
        return [];
      }
      return (data as ServiceCaseRow[]).map(rowToCustomerJob);
    } catch (err) {
      console.error("[SupabaseAdapter] getJobs exception:", err);
      return [];
    }
  }

  async getJob(id: string): Promise<CustomerJob | undefined> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("service_cases")
        .select("*, customers(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("[SupabaseAdapter] getJob error:", error);
        return undefined;
      }
      return rowToCustomerJob(data as ServiceCaseRow);
    } catch (err) {
      console.error("[SupabaseAdapter] getJob exception:", err);
      return undefined;
    }
  }

  async saveJob(job: CustomerJob): Promise<void> {
    try {
      const sb = await getClient();

      // Upsert the customer record first
      const { error: custError } = await sb.from("customers").upsert(
        {
          id: job.id, // use job id as customer id for simplicity (1-to-1 mapping)
          name: job.customerName,
          phone: job.phone,
          email: job.email,
        },
        { onConflict: "id" }
      );

      if (custError) {
        console.error("[SupabaseAdapter] saveJob (customer upsert) error:", custError);
        return;
      }

      // Upsert the service case
      const { error: caseError } = await sb.from("service_cases").upsert(
        {
          id: job.id,
          customer_id: job.id,
          vehicle_type: job.vehicleType,
          brand_model: job.brandModel,
          problem: job.problem,
          internal_notes: job.internalNotes,
          status: job.status,
          price: job.price,
          payment_status: job.paymentStatus,
          source: job.source,
          next_step: job.nextStep,
          created_at: job.createdAt,
          preferred_date: job.preferredDate,
          pickup_delivery: job.pickupDelivery,
          campaign_code: job.campaignCode,
        },
        { onConflict: "id" }
      );

      if (caseError) {
        console.error("[SupabaseAdapter] saveJob (service_case upsert) error:", caseError);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] saveJob exception:", err);
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      const sb = await getClient();
      // Delete service_case first (FK constraint), then customer
      const { error: caseError } = await sb
        .from("service_cases")
        .delete()
        .eq("id", id);

      if (caseError) {
        console.error("[SupabaseAdapter] deleteJob (service_case) error:", caseError);
        return;
      }

      const { error: custError } = await sb
        .from("customers")
        .delete()
        .eq("id", id);

      if (custError) {
        console.error("[SupabaseAdapter] deleteJob (customer) error:", custError);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] deleteJob exception:", err);
    }
  }

  // --- Quotes ---

  async getQuotes(): Promise<Quote[]> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("quotes")
        .select("*, quote_parts(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[SupabaseAdapter] getQuotes error:", error);
        return [];
      }
      return (data as QuoteRow[]).map(rowToQuote);
    } catch (err) {
      console.error("[SupabaseAdapter] getQuotes exception:", err);
      return [];
    }
  }

  async saveQuote(quote: Quote): Promise<void> {
    try {
      const sb = await getClient();

      // Upsert the quote row
      const { error: quoteError } = await sb.from("quotes").upsert(
        {
          id: quote.id,
          job_id: quote.jobId,
          customer_name: quote.customerName,
          diagnostics: quote.diagnostics,
          repair_labor: quote.repairLabor,
          extra_work: quote.extraWork,
          pickup_delivery: quote.pickupDelivery,
          discount: quote.discount,
          notes: quote.notes,
          created_at: quote.createdAt,
        },
        { onConflict: "id" }
      );

      if (quoteError) {
        console.error("[SupabaseAdapter] saveQuote (quote upsert) error:", quoteError);
        return;
      }

      // Replace all parts for this quote
      await sb.from("quote_parts").delete().eq("quote_id", quote.id);

      if (quote.parts.length > 0) {
        const { error: partsError } = await sb.from("quote_parts").insert(
          quote.parts.map((p) => ({
            quote_id: quote.id,
            name: p.name,
            price: p.price,
          }))
        );

        if (partsError) {
          console.error("[SupabaseAdapter] saveQuote (parts insert) error:", partsError);
        }
      }
    } catch (err) {
      console.error("[SupabaseAdapter] saveQuote exception:", err);
    }
  }

  async deleteQuote(id: string): Promise<void> {
    try {
      const sb = await getClient();
      await sb.from("quote_parts").delete().eq("quote_id", id);
      const { error } = await sb.from("quotes").delete().eq("id", id);
      if (error) {
        console.error("[SupabaseAdapter] deleteQuote error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] deleteQuote exception:", err);
    }
  }

  // --- Pricing ---

  async getPricing(): Promise<PricingItem[]> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("price_rules")
        .select("*")
        .order("category");

      if (error) {
        console.error("[SupabaseAdapter] getPricing error:", error);
        return [];
      }
      return (data as PriceRuleRow[]).map(rowToPricingItem);
    } catch (err) {
      console.error("[SupabaseAdapter] getPricing exception:", err);
      return [];
    }
  }

  async savePricingItem(item: PricingItem): Promise<void> {
    try {
      const sb = await getClient();
      const { error } = await sb.from("price_rules").upsert(
        {
          id: item.id,
          service: item.service,
          category: item.category,
          standard_price: item.standardPrice,
          min_price: item.minPrice,
          premium_price: item.premiumPrice,
          note: item.note,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("[SupabaseAdapter] savePricingItem error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] savePricingItem exception:", err);
    }
  }

  async deletePricingItem(id: string): Promise<void> {
    try {
      const sb = await getClient();
      const { error } = await sb.from("price_rules").delete().eq("id", id);
      if (error) {
        console.error("[SupabaseAdapter] deletePricingItem error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] deletePricingItem exception:", err);
    }
  }

  // --- Content Ideas ---

  async getContentIdeas(): Promise<ContentIdea[]> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("content_ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[SupabaseAdapter] getContentIdeas error:", error);
        return [];
      }
      return (data as ContentIdeaRow[]).map(rowToContentIdea);
    } catch (err) {
      console.error("[SupabaseAdapter] getContentIdeas exception:", err);
      return [];
    }
  }

  async saveContentIdea(idea: ContentIdea): Promise<void> {
    try {
      const sb = await getClient();
      const { error } = await sb.from("content_ideas").upsert(
        {
          id: idea.id,
          title: idea.title,
          type: idea.type,
          notes: idea.notes,
          status: idea.status,
          hook: idea.hook,
          problem: idea.problem,
          solution: idea.solution,
          result: idea.result,
          cta: idea.cta,
          created_at: idea.createdAt,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("[SupabaseAdapter] saveContentIdea error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] saveContentIdea exception:", err);
    }
  }

  async deleteContentIdea(id: string): Promise<void> {
    try {
      const sb = await getClient();
      const { error } = await sb.from("content_ideas").delete().eq("id", id);
      if (error) {
        console.error("[SupabaseAdapter] deleteContentIdea error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] deleteContentIdea exception:", err);
    }
  }

  // --- Settings ---

  async getSettings(): Promise<AppSettings> {
    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error || !data) {
        return { ...DEFAULT_SETTINGS };
      }
      return rowToAppSettings(data as AppSettingsRow);
    } catch (err) {
      console.error("[SupabaseAdapter] getSettings exception:", err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const sb = await getClient();
      const { error } = await sb.from("app_settings").upsert(
        {
          id: 1,
          company_name: settings.companyName,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          default_discount: settings.defaultDiscount,
          default_pickup_fee: settings.defaultPickupFee,
          accent_color: settings.accentColor,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("[SupabaseAdapter] saveSettings error:", error);
      }
    } catch (err) {
      console.error("[SupabaseAdapter] saveSettings exception:", err);
    }
  }

  // --- Bulk ---

  async exportAllData(): Promise<string> {
    const [jobs, quotes, pricing, content, settings] = await Promise.all([
      this.getJobs(),
      this.getQuotes(),
      this.getPricing(),
      this.getContentIdeas(),
      this.getSettings(),
    ]);

    return JSON.stringify(
      { jobs, quotes, pricing, content, settings, exportedAt: new Date().toISOString() },
      null,
      2
    );
  }

  async importAllData(json: string): Promise<void> {
    const data = JSON.parse(json) as {
      jobs?: CustomerJob[];
      quotes?: Quote[];
      pricing?: PricingItem[];
      content?: ContentIdea[];
      settings?: AppSettings;
    };

    const tasks: Promise<void>[] = [];

    if (data.jobs) {
      tasks.push(...data.jobs.map((j) => this.saveJob(j)));
    }
    if (data.quotes) {
      tasks.push(...data.quotes.map((q) => this.saveQuote(q)));
    }
    if (data.pricing) {
      tasks.push(...data.pricing.map((p) => this.savePricingItem(p)));
    }
    if (data.content) {
      tasks.push(...data.content.map((c) => this.saveContentIdea(c)));
    }
    if (data.settings) {
      tasks.push(this.saveSettings(data.settings));
    }

    await Promise.all(tasks);
  }
}
