# Database Schema — Nordic E-Mobility Ops

## 1. Overview

The ops app is an internal workshop management system for Nordic E-Mobility. It handles service cases from intake to payment, customer records, price quotes, SMS communication, and social media content planning.

**Backend:** Supabase (PostgreSQL). All tables use UUID primary keys and `TIMESTAMPTZ` for timestamps.

**Current state:** The application ships with a `LocalStorageAdapter` as the default backend. The `SupabaseAdapter` is the production target and the schema below describes the Supabase/PostgreSQL data model.

---

## 2. Tables

### `customers`

Stores customer contact records. A single customer may have multiple service cases over time.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key, `gen_random_uuid()` |
| `name` | `TEXT` | Full name |
| `phone` | `TEXT` | Swedish mobile number, used for SMS via 46elks |
| `email` | `TEXT` | Contact email |
| `created_at` | `TIMESTAMPTZ` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last modification timestamp |

**Relationships:** `customers.id` ← `service_cases.customer_id`

---

### `service_cases`

Core table. Each row represents one repair or service job. Linked to a customer and progresses through a defined status workflow.

**Status workflow:** `Ny` → `Felsökning` → `Pågår` → `Väntar på delar` → `Klar` → `Väntar på betalning` → `Slutförd`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `customer_id` | `UUID` | FK → `customers.id` |
| `vehicle_type` | `TEXT` | E.g. "Elcykel", "Elsparkcykel" |
| `brand_model` | `TEXT` | Make and model of the vehicle |
| `problem` | `TEXT` | Customer-reported fault description |
| `internal_notes` | `TEXT` | Workshop-internal notes |
| `status` | `TEXT` | One of the seven workflow values above |
| `price` | `NUMERIC(10,2)` | Agreed or estimated price (SEK) |
| `payment_status` | `TEXT` | `Ej betald` / `Delbetald` / `Betald` |
| `source` | `TEXT` | Lead source: `Website`, `Facebook`, `Instagram`, `Walk-in`, `Referral`, `Phone`, `Other` |
| `next_step` | `TEXT` | Free-text field for the technician's immediate next action |
| `preferred_date` | `DATE` | Customer's requested service date |
| `pickup_delivery` | `TEXT` | Hämtning/Lämning preference |
| `campaign_code` | `TEXT` | Optional discount or tracking code |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

**Relationships:**
- `service_cases.customer_id` → `customers.id`
- `service_cases.id` ← `case_events.case_id`
- `service_cases.id` ← `quotes.case_id`
- `service_cases.id` ← `sms_drafts.case_id`
- `service_cases.id` ← `call_logs.case_id`
- `service_cases.id` ← `part_needs.case_id`
- `service_cases.id` ← `ai_recommendations.case_id`
- `service_cases.id` ← `payments.case_id`

**Note:** Cases should never be hard-deleted. Use `Slutförd` as the terminal status. Deletion requires admin role.

---

### `case_events`

Append-only audit log. Every meaningful change to a case — status transitions, notes, SMS sent, calls logged — creates a new row here. Rows are never deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `event_type` | `TEXT` | E.g. `status_change`, `note_added`, `sms_sent`, `call_logged`, `quote_created` |
| `payload` | `JSONB` | Event-specific data (old/new status, message body, etc.) |
| `created_by` | `UUID` | Auth user who triggered the event |
| `created_at` | `TIMESTAMPTZ` | |

**Note:** Write-only from the application. No update or delete operations are permitted.

---

### `quotes`

Price quotes associated with a service case. A case may have multiple quotes (e.g. revised estimates).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `customer_name` | `TEXT` | Denormalised for display on the quote document |
| `diagnostics` | `NUMERIC(10,2)` | Diagnostic fee (SEK) |
| `repair_labor` | `NUMERIC(10,2)` | Labour cost (SEK) |
| `extra_work` | `NUMERIC(10,2)` | Additional work not covered by standard labour |
| `pickup_delivery` | `NUMERIC(10,2)` | Hämtning/Lämning fee |
| `discount` | `NUMERIC(10,2)` | Discount amount (SEK) |
| `notes` | `TEXT` | Quote-level notes visible to the customer |
| `created_at` | `TIMESTAMPTZ` | |

**Relationships:** `quotes.id` ← `quote_parts.quote_id`

---

### `quote_parts`

Individual parts line-items on a quote. Each row is one part.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `quote_id` | `UUID` | FK → `quotes.id` (cascade delete) |
| `name` | `TEXT` | Part name or description |
| `price` | `NUMERIC(10,2)` | Unit price (SEK) |
| `sort_order` | `INTEGER` | Display order on the quote |

---

### `sms_drafts`

SMS messages sent or queued via the 46elks integration. Kept indefinitely for audit purposes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `recipient_phone` | `TEXT` | Destination number |
| `body` | `TEXT` | Message text |
| `status` | `TEXT` | `draft`, `sent`, `failed` |
| `elks_message_id` | `TEXT` | ID returned by 46elks API (nullable) |
| `sent_at` | `TIMESTAMPTZ` | When the message was dispatched (nullable) |
| `created_at` | `TIMESTAMPTZ` | |

---

### `call_logs`

Records of phone calls related to a service case.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `direction` | `TEXT` | `inbound` or `outbound` |
| `phone` | `TEXT` | The other party's number |
| `duration_seconds` | `INTEGER` | Call duration (nullable) |
| `notes` | `TEXT` | Summary of the call |
| `created_by` | `UUID` | Auth user who logged the call |
| `created_at` | `TIMESTAMPTZ` | |

---

### `part_needs`

Parts that a technician has flagged as needing to be ordered for a case.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `part_name` | `TEXT` | Description of the part |
| `quantity` | `INTEGER` | How many are needed |
| `ordered` | `BOOLEAN` | Whether the order has been placed |
| `received` | `BOOLEAN` | Whether the part has arrived |
| `notes` | `TEXT` | Supplier, lead time, etc. |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

---

### `price_rules`

Internal pricing database. Stores standard, minimum, and premium price tiers for each service type. Admin-managed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `service` | `TEXT` | Service name (e.g. "Punkteringslagning bak") |
| `category` | `TEXT` | One of: `Felsökning`, `Service`, `Punktering`, `Bromsar`, `Batteri`, `Kabeldragning`, `Hämtning/Lämning`, `Avancerad felsökning` |
| `standard_price` | `NUMERIC(10,2)` | Standard customer price (SEK) |
| `min_price` | `NUMERIC(10,2)` | Floor price |
| `premium_price` | `NUMERIC(10,2)` | Premium/complex job price |
| `note` | `TEXT` | Internal notes on pricing rationale |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

---

### `ai_recommendations`

AI-generated suggestions for a case (e.g. upsell recommendations, diagnostic hints). Written by the backend, read-only for the client. Future feature — table is created now to avoid a migration disruption later.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `recommendation_type` | `TEXT` | E.g. `diagnostic_hint`, `upsell`, `parts_suggestion` |
| `content` | `TEXT` | The recommendation text |
| `confidence` | `NUMERIC(4,3)` | Model confidence score (0.000–1.000) |
| `model` | `TEXT` | Which AI model produced this (e.g. `gpt-4o`) |
| `created_at` | `TIMESTAMPTZ` | |

---

### `content_ideas`

Social media content planning board. Ideas for posts tied to real workshop cases or general topics.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `title` | `TEXT` | Working title of the post |
| `type` | `TEXT` | `Före/Efter`, `Felsökning`, `Battericase`, `Kundcase`, `Servicetips` |
| `status` | `TEXT` | `Idé`, `Utkast`, `Publicerad` |
| `hook` | `TEXT` | Opening hook line |
| `problem` | `TEXT` | Problem described in the post |
| `solution` | `TEXT` | Solution shown |
| `result` | `TEXT` | Outcome / result |
| `cta` | `TEXT` | Call to action |
| `notes` | `TEXT` | Internal planning notes |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

---

### `payments`

Payment records per case. A case may have multiple payments (e.g. deposit then balance).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `case_id` | `UUID` | FK → `service_cases.id` |
| `method` | `TEXT` | `Swish`, `Card`, `Cash`, `Invoice` |
| `amount` | `NUMERIC(10,2)` | Amount paid (SEK) |
| `paid_at` | `TIMESTAMPTZ` | When payment was received |
| `reference` | `TEXT` | Swish transaction ID, card receipt number, etc. |
| `notes` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ` | |

---

### `app_settings`

Single-row table holding company-wide configuration. Enforced by a `CHECK (id = 1)` constraint — only one row is permitted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `INTEGER` | Always `1` |
| `company_name` | `TEXT` | Default: `Nordic E-Mobility` |
| `phone` | `TEXT` | Company phone number |
| `email` | `TEXT` | Company contact email |
| `address` | `TEXT` | Workshop address |
| `default_discount` | `NUMERIC(10,2)` | Default discount applied to new quotes |
| `default_pickup_fee` | `NUMERIC(10,2)` | Default Hämtning/Lämning fee (default: 299 SEK) |
| `accent_color` | `TEXT` | UI accent hex colour (default: `#4ade80`) |
| `updated_at` | `TIMESTAMPTZ` | |

---

## 3. Entity Relationship Diagram

```
customers
    │
    │ 1:N
    ▼
service_cases ──────────────────────────────────────────────────────┐
    │                                                                │
    ├─── 1:N ──► case_events          (audit log)                   │
    │                                                                │
    ├─── 1:N ──► quotes                                             │
    │                │                                              │
    │                └─── 1:N ──► quote_parts                       │
    │                                                                │
    ├─── 1:N ──► sms_drafts           (46elks messages)             │
    │                                                                │
    ├─── 1:N ──► call_logs                                          │
    │                                                                │
    ├─── 1:N ──► part_needs                                         │
    │                                                                │
    ├─── 1:N ──► ai_recommendations   (future)                      │
    │                                                                │
    └─── 1:N ──► payments                                           │
                                                                     │
Standalone tables (no FK to service_cases):                         │
    price_rules      (internal pricing database)                     │
    content_ideas    (social media planning)                         │
    app_settings     (single-row company config)                     │
```

---

## 4. Row Level Security (RLS) Plan

RLS is **enabled on all tables**. This ensures that no query can bypass access control, even if a misconfigured client reaches the database.

### Current policy

All authenticated users are treated as workshop staff and have full read/write access. This is a permissive default appropriate for an internal-only app where every logged-in user is a trusted employee.

```sql
-- Example permissive policy (applied to each table)
CREATE POLICY "authenticated_full_access"
  ON service_cases
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Future: role-based access

As the team grows, access should be tightened to three roles:

- **`admin`** — full access including destructive operations and config changes
- **`technician`** — read/write on operational tables; no access to pricing rules or app settings writes
- **`read_only`** — read access for reporting/analytics

### Per-table RLS strategy

| Table | Read | Write | Delete | Notes |
|-------|------|-------|--------|-------|
| `customers` | authenticated | authenticated | admin only | Customer data is sensitive; never bulk-delete |
| `service_cases` | authenticated | authenticated | admin only | Never hard-delete — use `Slutförd` status instead |
| `case_events` | authenticated | authenticated | never | Append-only audit log; no deletes permitted |
| `quotes` | authenticated | authenticated | authenticated | Draft quotes may be deleted by the creator |
| `quote_parts` | authenticated | authenticated | authenticated | Cascade-deleted with parent quote |
| `sms_drafts` | authenticated | authenticated | admin only | Retain for audit trail |
| `call_logs` | authenticated | authenticated | admin only | Retain for audit trail |
| `part_needs` | authenticated | authenticated | authenticated | |
| `price_rules` | authenticated | admin only | admin only | Pricing is admin-managed |
| `ai_recommendations` | authenticated | system only | system only | Written by server-side backend, never by the client |
| `content_ideas` | authenticated | authenticated | authenticated | |
| `payments` | authenticated | authenticated | admin only | Financial records must not be deleted without approval |
| `app_settings` | authenticated | admin only | never | Single-row; no deletion path |

### Key security rules

- **The service role key must never be exposed to the client.** It bypasses RLS entirely. Keep it in server-side environment variables only (`SUPABASE_SERVICE_ROLE_KEY`).
- **The anon key has no access.** No table policies grant permissions to the `anon` role. This app has no public-facing queries.
- All admin operations that do require the service role should go through a server-side API route, never from the browser.

---

## 5. Migration Strategy

Migrations live in `supabase/migrations/` and are applied with the Supabase CLI (`supabase db push` or `supabase migration up`).

### Rules

- **No destructive operations without explicit versioning.** Never run `DROP TABLE` or `DROP COLUMN` in a migration unless it has been reviewed, communicated to the team, and the column has been deprecated for at least one release cycle.
- **Additive changes only** for in-place schema updates:
  ```sql
  -- Good: additive with a safe default
  ALTER TABLE service_cases ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

  -- Bad: removes data
  ALTER TABLE service_cases DROP COLUMN campaign_code;
  ```
- All timestamps use `TIMESTAMPTZ` (not `TIMESTAMP WITHOUT TIME ZONE`).
- All primary keys use `UUID` generated by `gen_random_uuid()`.
- Migration files are named `YYYYMMDDHHMMSS_description.sql` and are never edited after they have been applied to production.

---

## 6. Storage Adapter Pattern

The app uses a storage adapter abstraction to support both offline development and production Supabase usage without code changes.

### Interface

Defined in `src/lib/storage-adapter.ts`:

```typescript
export interface StorageAdapter {
  // Jobs
  getJobs(): Promise<CustomerJob[]>;
  getJob(id: string): Promise<CustomerJob | undefined>;
  saveJob(job: CustomerJob): Promise<void>;
  deleteJob(id: string): Promise<void>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  saveQuote(quote: Quote): Promise<void>;
  deleteQuote(id: string): Promise<void>;

  // Pricing
  getPricing(): Promise<PricingItem[]>;
  savePricingItem(item: PricingItem): Promise<void>;
  deletePricingItem(id: string): Promise<void>;

  // Content Ideas
  getContentIdeas(): Promise<ContentIdea[]>;
  saveContentIdea(idea: ContentIdea): Promise<void>;
  deleteContentIdea(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // Bulk
  exportAllData(): Promise<string>;
  importAllData(json: string): Promise<void>;
}
```

### Implementations

| Adapter | File | When active |
|---------|------|-------------|
| `LocalStorageAdapter` | `src/lib/adapters/local-storage-adapter.ts` | Default — no env vars required. Uses browser `localStorage`. Ideal for offline development and demo use. |
| `SupabaseAdapter` | `src/lib/adapters/supabase-adapter.ts` *(planned)* | Active when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. |

Switching between adapters is automatic based on the presence of the Supabase environment variables. No application code needs to change.

### Legacy sync helpers

`src/lib/storage.ts` exports synchronous functions (`getJobs`, `saveJob`, etc.) that call `localStorage` directly. These exist for backward compatibility with components written before the adapter pattern was introduced. New code should use the async adapter methods instead.

---

## 7. Environment Variables

All variables are listed in `.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL. Exposed to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase anon/public key. Exposed to the browser. Has minimal permissions — no anon RLS policies exist. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | Bypasses RLS. Must never be sent to the client or committed to version control. Used in API routes only. |
| `OPENAI_API_KEY` | Future | OpenAI API key for AI recommendation features. Server-side only. |
| `ELKS_USERNAME` | SMS features | 46elks account username for sending SMS. Server-side only. |
| `ELKS_PASSWORD` | SMS features | 46elks account password. Server-side only. |
| `ELKS_WEBHOOK_SECRET` | SMS features | Secret used to verify incoming 46elks webhook payloads. Server-side only. |
| `SMS_DRY_RUN` | Development | Set to `true` to log SMS messages without actually sending them via 46elks. Default: `true`. |

---

## 8. Security Checklist

- [ ] RLS enabled on all tables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` used only in server-side API routes, never in client code
- [ ] Anon key has no RLS policies — zero public access
- [ ] No admin data (`app_settings`, `price_rules`) exposed via client-side queries
- [ ] 46elks webhook requests verified with `ELKS_WEBHOOK_SECRET`
- [ ] Input validation on all API routes before database writes
- [ ] `SMS_DRY_RUN=true` confirmed off before going live in production
- [ ] Rate limiting on any public-facing endpoints (future)
- [ ] `case_events` rows are never deleted — audit trail is intact
- [ ] Service cases are soft-closed (`Slutförd`) rather than hard-deleted
