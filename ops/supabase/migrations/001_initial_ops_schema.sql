-- =============================================================================
-- Nordic E-Mobility Ops — Initial Schema
-- Migration: 001_initial_ops_schema.sql
-- =============================================================================
-- Creates all tables, indexes, RLS policies, and default data for the
-- internal ops application. No destructive operations; safe to run on a
-- fresh Supabase project.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- Central contact record. phone has a conditional unique index (see below)
-- to allow multiple NULL/empty rows while still preventing duplicate numbers.
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    phone       TEXT,
    email       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- SERVICE CASES
-- The core "job" entity. Each row represents one repair or service visit.
-- ---------------------------------------------------------------------------
CREATE TABLE service_cases (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID         REFERENCES customers(id) ON DELETE CASCADE,

    -- Vehicle info
    vehicle_type     TEXT,
    brand_model      TEXT,

    -- Job details
    problem          TEXT,
    internal_notes   TEXT,
    next_step        TEXT,

    -- Workflow state
    status           TEXT         NOT NULL DEFAULT 'Ny'
                                  CHECK (status IN (
                                      'Ny',
                                      'Felsökning',
                                      'Pågår',
                                      'Väntar på delar',
                                      'Klar',
                                      'Väntar på betalning',
                                      'Slutförd'
                                  )),

    -- Financials
    price            NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status   TEXT          NOT NULL DEFAULT 'Ej betald'
                                   CHECK (payment_status IN (
                                       'Ej betald',
                                       'Delbetald',
                                       'Betald'
                                   )),

    -- Lead / booking metadata
    source           TEXT          DEFAULT 'Walk-in'
                                   CHECK (source IN (
                                       'Website',
                                       'Facebook',
                                       'Instagram',
                                       'Walk-in',
                                       'Referral',
                                       'Phone',
                                       'Other'
                                   )),
    preferred_date   TIMESTAMPTZ,
    pickup_delivery  TEXT,
    campaign_code    TEXT,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- CASE EVENTS
-- Append-only audit log for status changes, payment updates, notes,
-- SMS messages sent, quotes sent, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE case_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID        NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,

    -- e.g. 'status_change', 'payment_change', 'note', 'sms_sent', 'quote_sent'
    event_type   TEXT        NOT NULL,

    old_value    TEXT,
    new_value    TEXT,
    note         TEXT,

    created_by   TEXT        NOT NULL DEFAULT 'system',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No updated_at: events are immutable once written.
);


-- ---------------------------------------------------------------------------
-- QUOTES
-- Price estimates attached to a service case. A case may have multiple
-- quote revisions; case_id is nullable so drafts can be saved before a
-- case is created.
-- ---------------------------------------------------------------------------
CREATE TABLE quotes (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID          REFERENCES service_cases(id) ON DELETE SET NULL,

    customer_name    TEXT,

    -- Line totals (parts are stored in quote_parts)
    diagnostics      NUMERIC(10,2) NOT NULL DEFAULT 0,
    repair_labor     NUMERIC(10,2) NOT NULL DEFAULT 0,
    extra_work       NUMERIC(10,2) NOT NULL DEFAULT 0,
    pickup_delivery  NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount         NUMERIC(10,2) NOT NULL DEFAULT 0,

    notes            TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- QUOTE PARTS
-- Individual parts / materials line-items within a quote.
-- ---------------------------------------------------------------------------
CREATE TABLE quote_parts (
    id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id  UUID          NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name      TEXT          NOT NULL,
    price     NUMERIC(10,2) NOT NULL
);


-- ---------------------------------------------------------------------------
-- SMS DRAFTS
-- Outbound SMS messages composed inside the app and dispatched via 46elks.
-- The external_id stores the message ID returned by the 46elks API so
-- delivery status can be queried later.
-- ---------------------------------------------------------------------------
CREATE TABLE sms_drafts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID        REFERENCES service_cases(id) ON DELETE SET NULL,
    customer_id  UUID        REFERENCES customers(id)    ON DELETE SET NULL,

    to_phone     TEXT        NOT NULL,
    body         TEXT        NOT NULL,

    status       TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'sent', 'failed')),

    sent_at      TIMESTAMPTZ,
    external_id  TEXT,       -- 46elks message ID

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- CALL LOGS
-- Records of inbound and outbound phone calls, optionally linked to a case
-- and/or customer. Populated by the 46elks voice webhook.
-- ---------------------------------------------------------------------------
CREATE TABLE call_logs (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id           UUID        REFERENCES service_cases(id) ON DELETE SET NULL,
    customer_id       UUID        REFERENCES customers(id)     ON DELETE SET NULL,

    direction         TEXT        CHECK (direction IN ('inbound', 'outbound')),
    from_number       TEXT,
    to_number         TEXT,
    duration_seconds  INTEGER,
    recording_url     TEXT,
    notes             TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- PART NEEDS
-- Parts that must be ordered to complete a service case. Tracks the full
-- lifecycle from identification through delivery.
-- ---------------------------------------------------------------------------
CREATE TABLE part_needs (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID          NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,

    description      TEXT          NOT NULL,
    quantity         INTEGER       NOT NULL DEFAULT 1,
    estimated_price  NUMERIC(10,2),

    status           TEXT          NOT NULL DEFAULT 'needed'
                                   CHECK (status IN ('needed', 'ordered', 'received')),

    supplier         TEXT,
    ordered_at       TIMESTAMPTZ,
    received_at      TIMESTAMPTZ,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- PRICE RULES
-- Reference pricing for common services. Used to pre-fill quotes and
-- guide pricing decisions.
-- ---------------------------------------------------------------------------
CREATE TABLE price_rules (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    service         TEXT          NOT NULL,
    category        TEXT          NOT NULL,
    standard_price  NUMERIC(10,2) NOT NULL,
    min_price       NUMERIC(10,2),
    premium_price   NUMERIC(10,2),
    note            TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- AI RECOMMENDATIONS
-- Stores suggestions generated by the AI layer (diagnosis, pricing, content,
-- follow-up nudges, etc.). The confidence column holds a 0.00–1.00 score.
-- ---------------------------------------------------------------------------
CREATE TABLE ai_recommendations (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id              UUID          NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,

    -- e.g. 'diagnosis', 'pricing', 'follow_up', 'content'
    recommendation_type  TEXT          NOT NULL,
    content              TEXT          NOT NULL,
    confidence           NUMERIC(3,2)  CHECK (confidence BETWEEN 0 AND 1),
    accepted             BOOLEAN,

    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- CONTENT IDEAS
-- Social-media / marketing content pipeline. Tracks ideas from first draft
-- through publication, with structured fields for the Reels/Shorts format.
-- ---------------------------------------------------------------------------
CREATE TABLE content_ideas (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    title       TEXT        NOT NULL,
    type        TEXT        CHECK (type IN (
                                'Före/Efter',
                                'Felsökning',
                                'Battericase',
                                'Kundcase',
                                'Servicetips'
                            )),

    notes       TEXT,
    status      TEXT        NOT NULL DEFAULT 'Idé'
                            CHECK (status IN ('Idé', 'Utkast', 'Publicerad')),

    -- Structured narrative fields (used when drafting video scripts)
    hook        TEXT,
    problem     TEXT,
    solution    TEXT,
    result      TEXT,
    cta         TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- PAYMENTS
-- Individual payment transactions against a service case (supports partial
-- and split payments across multiple methods).
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id   UUID          NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,

    amount    NUMERIC(10,2) NOT NULL,
    method    TEXT          CHECK (method IN ('swish', 'card', 'cash', 'invoice', 'other')),
    reference TEXT,
    note      TEXT,

    paid_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- APP SETTINGS
-- Single-row configuration table (enforced by CHECK id = 1).
-- Use UPSERT with id = 1 to update values.
-- ---------------------------------------------------------------------------
CREATE TABLE app_settings (
    id                  INTEGER       PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name        TEXT          NOT NULL DEFAULT 'Nordic E-Mobility',
    phone               TEXT,
    email               TEXT,
    address             TEXT,
    default_discount    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    default_pickup_fee  NUMERIC(10,2) NOT NULL DEFAULT 299,
    accent_color        TEXT          NOT NULL DEFAULT '#4ade80',
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- service_cases — most common filters
CREATE INDEX idx_service_cases_customer_id     ON service_cases (customer_id);
CREATE INDEX idx_service_cases_status          ON service_cases (status);
CREATE INDEX idx_service_cases_payment_status  ON service_cases (payment_status);

-- case_events — always queried by case
CREATE INDEX idx_case_events_case_id           ON case_events (case_id);

-- quotes — joined to case
CREATE INDEX idx_quotes_case_id                ON quotes (case_id);

-- sms_drafts
CREATE INDEX idx_sms_drafts_case_id            ON sms_drafts (case_id);

-- part_needs — listed by case and filtered by status
CREATE INDEX idx_part_needs_case_id            ON part_needs (case_id);
CREATE INDEX idx_part_needs_status             ON part_needs (status);

-- Conditional unique index: no two customers may share the same phone number,
-- but NULL and empty-string values are excluded so the constraint doesn't
-- block contacts without a phone on file.
CREATE UNIQUE INDEX idx_customers_phone_unique
    ON customers (phone)
    WHERE phone IS NOT NULL AND phone <> '';


-- =============================================================================
-- UPDATED_AT TRIGGER
-- Automatically bumps the updated_at column on every row update so the
-- application never has to maintain this manually.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply the trigger to every table that carries an updated_at column.
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_cases_updated_at
    BEFORE UPDATE ON service_cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_price_rules_updated_at
    BEFORE UPDATE ON price_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_content_ideas_updated_at
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- RLS is enabled on every table. Because this is an internal single-tenant
-- app, all authenticated users are granted full read/write access via
-- permissive policies.
--
-- NOTE: If staff roles (e.g. technician vs. manager) are introduced later,
-- replace these broad policies with role-scoped equivalents using
-- auth.jwt() -> 'user_role' or a custom claims table.
-- =============================================================================

ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_cases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_parts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_drafts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_needs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;

-- Permissive "allow all" policies for authenticated users ---------------

CREATE POLICY "authenticated: full access" ON customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON service_cases
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON case_events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON quotes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON quote_parts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON sms_drafts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON call_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON part_needs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON price_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON ai_recommendations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON content_ideas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated: full access" ON app_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert the single app_settings row. Use ON CONFLICT so re-running this
-- migration (e.g. during local development resets) is idempotent.
INSERT INTO app_settings (id, company_name, default_discount, default_pickup_fee, accent_color)
VALUES (1, 'Nordic E-Mobility', 0, 299, '#4ade80')
ON CONFLICT (id) DO NOTHING;
