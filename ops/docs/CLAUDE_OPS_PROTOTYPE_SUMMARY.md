# Claude Ops-prototyp — Fullständig sammanfattning

> **Status:** Frusen prototyp. **Mergeas INTE till produktionsrepot.**
> Branch hålls som referensarkitektur.

---

## 1. Sammanfattning

Denna prototyp är ett komplett Next.js-baserat internt verkstadsystem
("Nordic E-Mobility Ops") byggt i `ops/`-katalogen. Det är en separat app
från den publika hemsidan.

Appen innehåller sex vyer — alla på svenska, mobilförst, mörkt skandinaviskt
tema:

1. **Instrumentpanel** — KPI-kort (aktiva jobb, obetalda, nya leads, klara
   denna vecka, beräknad intäkt), snabbåtgärder, dagens fokus, mock för
   "Importera bokning".
2. **Kunder & Jobb** — full CRUD för serviceärenden med sök, statusfilter,
   detaljvy, snabb status-/betalningsändring.
3. **Offert** — offertbyggare med automatisk summering och genererad svensk
   kundofferttext + kopiera-till-urklipp.
4. **Prisdatabas** — intern prislista med kategorier, sök och CRUD.
5. **Innehållsidéer** — innehållsplanering med inläggshjälp
   (Hook / Problem / Lösning / Resultat / CTA).
6. **Inställningar** — företagsinfo, JSON-export/import, demodata-reset,
   platshållare för framtida integrationer.

Dessutom byggdes ett storage-adapterlager som förberedelse för Supabase, samt
en komplett SQL-migration med 13 tabeller.

**Tech stack:** Next.js 16, TypeScript, Tailwind CSS v4, lucide-react,
Radix UI primitives, localStorage (med adapter-mönster för framtida backend).

---

## 2. Ändrade/skapade filer

### Konfiguration & env

| Fil | Beskrivning |
|-----|-------------|
| `ops/.env.example` | Env-variabelkarta: Supabase, OpenAI, 46elks (SMS_DRY_RUN=true) |
| `ops/.gitignore` | Uppdaterad: tillåter `.env.example`, blockerar `.env`/`.env.local` |
| `ops/next.config.ts` | Turbopack root-fix |
| `ops/package.json` | Dependencies: next, react, tailwind, lucide-react, radix, cva, clsx, tailwind-merge |
| `ops/tsconfig.json` | TypeScript strict, path alias `@/*` → `./src/*` |

### Domänmodell & lagring

| Fil | Beskrivning |
|-----|-------------|
| `ops/src/lib/types.ts` | Alla interfaces: `CustomerJob`, `Quote`, `QuotePart`, `PricingItem`, `ContentIdea`, `AppSettings`, `BookingImportPayload`. Alla enums: `JobStatus`, `PaymentStatus`, `JobSource`, `ContentType`, `ContentStatus`, `PRICING_CATEGORIES`. |
| `ops/src/lib/storage.ts` | Alla get/save/delete-funktioner (sync, localStorage). Affärslogik: `createCustomerJob`, `updateJobStatus`, `updatePaymentStatus`, `mapBookingPayloadToCustomerJob`, `importBooking`. Async-varianter (`*Async`) via adapter. |
| `ops/src/lib/storage-adapter.ts` | `StorageAdapter` interface — 16 async metoder. |
| `ops/src/lib/adapters/index.ts` | `getAdapter()` singleton: väljer adapter baserat på env. |
| `ops/src/lib/adapters/local-storage-adapter.ts` | `LocalStorageAdapter` — implementerar interfacet mot `localStorage`. |
| `ops/src/lib/adapters/supabase-adapter.ts` | `SupabaseAdapter` — implementerar interfacet mot Supabase. Lazy-loadar `@supabase/supabase-js`. Mappar platt `CustomerJob` till normaliserade tabeller (customers + service_cases). |
| `ops/src/lib/store.ts` | `RefreshContext` för React-state-propagering. |
| `ops/src/lib/utils.ts` | `cn()`, `generateId()`, `formatDate()`, `formatCurrency()`, `copyToClipboard()`. |
| `ops/src/lib/seed.ts` | Demodata: 6 jobb, 10 prisrader, 2 innehållsidéer. |

### Databas & dokumentation

| Fil | Beskrivning |
|-----|-------------|
| `ops/supabase/migrations/001_initial_ops_schema.sql` | 462 rader SQL: 13 tabeller, 9 index, 5 triggers, RLS på alla tabeller, seed-data. |
| `ops/docs/DATABASE_SCHEMA.md` | Tabellbeskrivningar, text-ER-diagram, RLS-plan per tabell, migrationsstrategi, env-dokumentation, säkerhetschecklista. |

### UI-komponenter

| Fil | Beskrivning |
|-----|-------------|
| `ops/src/components/ui/button.tsx` | Button med 5 varianter + 4 storlekar, `asChild`-stöd via Radix Slot |
| `ops/src/components/ui/input.tsx` | Input med mörkt tema, grön fokusring |
| `ops/src/components/ui/textarea.tsx` | Textarea matchande input |
| `ops/src/components/ui/select.tsx` | Native select med egen chevron |
| `ops/src/components/ui/badge.tsx` | Badge med 10 varianter (semantic: active, waiting, urgent, unpaid, info) |
| `ops/src/components/ui/card.tsx` | Card/CardHeader/CardTitle/CardContent/CardFooter |
| `ops/src/components/ui/dialog.tsx` | Radix Dialog med mörk overlay, mobil-anpassad, scroll |
| `ops/src/components/app-shell.tsx` | Layout-wrapper: RefreshContext + NewJobContext |
| `ops/src/components/desktop-sidebar.tsx` | Vänster sidebar (md+): logo, 6 navlänkar med ikoner, aktiv-state |
| `ops/src/components/mobile-nav.tsx` | Botten-nav (<md): Hem, Jobb, Ny (+), Offert, Mer (popup) |

### Sidor (routes)

| Fil | Route | Rader |
|-----|-------|-------|
| `ops/src/app/page.tsx` | `/` Instrumentpanel | 871 |
| `ops/src/app/jobb/page.tsx` | `/jobb` Kunder & Jobb | 1 196 |
| `ops/src/app/offert/page.tsx` | `/offert` Offert | 688 |
| `ops/src/app/prisdatabas/page.tsx` | `/prisdatabas` Prisdatabas | 619 |
| `ops/src/app/innehall/page.tsx` | `/innehall` Innehållsidéer | 507 |
| `ops/src/app/installningar/page.tsx` | `/installningar` Inställningar | 394 |
| `ops/src/app/layout.tsx` | Root layout | 22 |
| `ops/src/app/globals.css` | Designsystem (CSS-variabler, utility-klasser) | 587 |

---

## 3. Arkitektur

### Storage-adapter-mönstret

```
  UI-sidor
     |  importerar getJobs / saveJob / ... (sync, localStorage)
     |  eller getJobsAsync / saveJobAsync / ... (async, adapter)
     v
  storage.ts
     |
     |  getAdapter()  -- singleton, väljer implementation via env
     v
  StorageAdapter (interface, 16 async metoder)
     |--- LocalStorageAdapter   (standard -- ingen env krävs)
     |--- SupabaseAdapter       (om NEXT_PUBLIC_SUPABASE_URL är satt)
```

### Hur det fungerar

- **`getAdapter()`** i `adapters/index.ts` kontrollerar om
  `NEXT_PUBLIC_SUPABASE_URL` har ett värde.
  - Om **ja** → `require("./supabase-adapter")` (lazy) → `new SupabaseAdapter()`
  - Om **nej** → `new LocalStorageAdapter()`
- Resultatet cachas som **singleton** — skapas bara en gång per app-livstid.

### Sync vs async exports

- **Sync** (`getJobs`, `saveJob`, etc.) — anropar `localStorage` direkt.
  Alla befintliga sidor använder dessa. Inga breaking changes.
- **Async** (`getJobsAsync`, `saveJobAsync`, etc.) — delegerar till
  `adapter.getJobs()` etc. Tänkta för stegvis migration till riktig backend.

### Lazy loading av Supabase

`supabase-adapter.ts` importerar INTE `@supabase/supabase-js` på toppnivå.
Klienten skapas on-demand i `getClient()` via dynamisk import. Detta innebär:

- Bygget fungerar utan `@supabase/supabase-js` installerat.
- Paketet laddas bara om `SupabaseAdapter` faktiskt instansieras.
- `adapters/index.ts` använder `require()` (lazy) för att undvika att
  bundlern drar in Supabase-kod i standard-bygget.

### Fallback när env saknas

Ingen `.env`-fil → `getAdapter()` returnerar `LocalStorageAdapter` →
appen fungerar exakt som före adapter-införandet, enbart med localStorage.

---

## 4. Databas

### Supabase-migrationen (`001_initial_ops_schema.sql`)

**13 tabeller:**

| Tabell | Syfte | Nyckelrelationer |
|--------|-------|------------------|
| `customers` | Kundregister | — |
| `service_cases` | Ärenden/jobb | → `customers.id` (FK, CASCADE) |
| `case_events` | Append-only händelselogg | → `service_cases.id` (FK, CASCADE) |
| `quotes` | Offerter | → `service_cases.id` (FK, SET NULL) |
| `quote_parts` | Offertrader (delar) | → `quotes.id` (FK, CASCADE) |
| `sms_drafts` | SMS via 46elks | → `service_cases.id`, → `customers.id` |
| `call_logs` | Samtalshistorik | → `service_cases.id`, → `customers.id` |
| `part_needs` | Reservdelsbeställningar | → `service_cases.id` (FK, CASCADE) |
| `price_rules` | Intern prisdatabas | — |
| `ai_recommendations` | AI-förslag (framtida) | → `service_cases.id` (FK, CASCADE) |
| `content_ideas` | Innehållsplanering | — |
| `payments` | Betalningar (Swish/kort/kontant/faktura) | → `service_cases.id` (FK, CASCADE) |
| `app_settings` | Företagsconfig (single-row, CHECK id=1) | — |

**9 index:**
- `service_cases`: customer_id, status, payment_status
- `case_events`: case_id
- `quotes`: case_id
- `sms_drafts`: case_id
- `part_needs`: case_id, status
- `customers`: phone (unikt, exkluderar NULL/tom)

**5 updated_at-triggers:**
- `customers`, `service_cases`, `price_rules`, `content_ideas`, `app_settings`

**RLS-plan:**
- RLS aktiverat på alla 13 tabeller
- Nuvarande policy: `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
- Kommentar i SQL:en om att mer granulära policies bör läggas till vid
  rollbaserad åtkomst (admin/tekniker/readonly)
- `case_events` bör vara append-only (aldrig delete)
- `app_settings` och `price_rules` bör vara skrivskyddade för icke-admins

**Viktiga relationer:**
```
customers 1──N service_cases 1──N case_events
                              1──N quotes 1──N quote_parts
                              1──N sms_drafts
                              1──N call_logs
                              1──N part_needs
                              1──N ai_recommendations
                              1──N payments
```

---

## 5. Vad kan återanvändas

Följande koncept och datadesigner är direkt värdefulla att översätta till
huvudrepot, oavsett implementation:

| Koncept | Vad det ger | Referensfil |
|---------|-------------|-------------|
| **Storage-adapter-mönstret** | Enkel backend-switch. Samma interface, byt implementation. | `storage-adapter.ts` |
| **Datamodellen / types** | Fältdefinitioner, statusflöden, enums. Ren TypeScript, ingen framework-koppling. | `types.ts` |
| **price_rules** | Tjänst + kategori + standard/min/premium-pris. Bra för prisuppslag och offerter. | SQL + `PricingItem`-type |
| **sms_drafts** | SMS-utkast med status (draft/sent/failed), koppling till ärende och kund, 46elks external_id. | SQL-tabell |
| **call_logs** | Samtalshistorik med riktning, varaktighet, inspelning-URL. | SQL-tabell |
| **case_events (timeline)** | Append-only händelselogg per ärende. event_type: status_change, payment_change, note, sms_sent, quote_sent. Ger fullständig ärendehistorik. | SQL-tabell |
| **ai_recommendations** | Struktur för AI-förslag med typ, innehåll, konfidens, accepterat/ej. | SQL-tabell |
| **payments** | Betalningsposter per ärende med metod (Swish/kort/kontant/faktura), referens, belopp. Möjliggör delbetalningar. | SQL-tabell |
| **part_needs** | Reservdelsbehov per ärende med status (needed/ordered/received), leverantör, pris. | SQL-tabell |
| **Booking import-adapter** | `mapBookingPayloadToCustomerJob()` — transformerar webbplatsbokning till internt ärende med korrekt status, källa, nästa steg. | `storage.ts` |
| **Offert-textgenerering** | Logiken för att bygga svensk offerttext (itemized breakdown, rabatt, total, 30-dagars giltighet). | `offert/page.tsx` |

---

## 6. Vad som INTE kan mergeas direkt

| Del | Varför inte |
|-----|-------------|
| **Hela `ops/`-appen (Next.js)** | Produktionssystemet är statisk HTML/JS på Netlify. Next.js App Router, React Server Components och Turbopack-bygget har ingen plats i den stacken. |
| **`storage.ts`** | Bygger på `localStorage` i webbläsaren. Produktionsrepot använder Netlify Blobs via serverside Functions — helt annan API-yta och exekveringsmiljö. |
| **`SupabaseAdapter` + `@supabase/supabase-js`** | Förutsätter Supabase-klient, PostgreSQL-instance och specifika tabellnamn. Ingen Supabase finns i produktionsmiljön i nuläget. |
| **SQL-migrationen** | Kräver en PostgreSQL-databas (Supabase). Huvudrepot använder Netlify Blobs, inte SQL. Migrationen är bara relevant om/när Supabase införs. |
| **React-komponenter** | Kräver React 19 runtime, JSX-kompilering, och Next.js App Router. Produktionens statiska HTML har inget av detta. |
| **Tailwind/shadcn/lucide/Radix-beroenden** | Produktionens frontend har egen styling via vanlig CSS. npm-paketen tillhör Next.js-appen. |
| **`next.config.ts`, `tsconfig.json`, `postcss.config.mjs`** | Next.js-specifik konfiguration utan motsvarighet i Netlify-miljön. |

---

## 7. Översättning till huvudrepot

Så här bör prototypens idéer implementeras i produktionsarkitekturen:

### a) Netlify Functions istället för Next.js API-routes

Prototypen har inget serverside-API (klient-only med localStorage). Men
datamodellen och CRUD-logiken ska exponeras via Netlify Functions:

```
netlify/functions/
  jobs.js          -- GET (lista), POST (skapa), PUT (uppdatera)
  jobs-[id].js     -- GET (detalj), DELETE (radera)
  quotes.js        -- GET, POST
  pricing.js       -- GET, POST, PUT, DELETE
  case-events.js   -- GET (per ärende), POST (append)
  sms-drafts.js    -- GET, POST, PUT
  settings.js      -- GET, PUT
```

### b) Netlify Blobs istället för Supabase

En blob-store per entitetstyp. Dokument lagras som JSON med `id` som nyckel:

| Entitet | Blob-store | Nyckel | Notering |
|---------|-----------|--------|----------|
| Ärenden | `service_cases` | `{id}` | Inkludera kunddata inbäddat (ingen join) |
| Kunder | `customers` | `{id}` | Separat om man vill slå upp per kund |
| Offerter | `quotes` | `{id}` | Bädda in `quote_parts` i samma JSON |
| Priser | `price_rules` | `{id}` | — |
| Händelselogg | `case_events` | `{case_id}/{timestamp}` | Prefix-listning per ärende |
| SMS-utkast | `sms_drafts` | `{id}` | — |
| Samtalslogg | `call_logs` | `{id}` | — |
| Reservdelar | `part_needs` | `{id}` | — |
| AI-förslag | `ai_recommendations` | `{id}` | — |
| Betalningar | `payments` | `{id}` | — |
| Innehåll | `content_ideas` | `{id}` | — |
| Inställningar | `app_settings` | `"default"` | Alltid en enda post |

### c) Cloudflare Worker / 46elks

Befintlig Cloudflare Worker behålls för webhook-mottagning. Koppla till
ops-systemet via:

- **sms_drafts** — Functions skapar utkast i Blobs, Worker skickar och
  uppdaterar status (`sent`/`failed`) + `external_id`.
- **call_logs** — Worker loggar inkommande/utgående samtal till Blobs.

### d) Admin-autentisering

Huvudrepot använder `x-admin-token` / `ADMIN_TOKEN` pattern. Behåll detta:

- Alla Netlify Functions som skriver data kräver
  `req.headers["x-admin-token"] === process.env.ADMIN_TOKEN`
- Läsoperationer kan vara öppna internt eller skyddade beroende på behov
- Känslig data (priser, inställningar) = admin-only skrivning

### e) AI och SMS dry-run/mock

Alla AI- och SMS-funktioner ska ha dry-run-stöd:

- `SMS_DRY_RUN=true` → logga SMS till konsol/blob istället för att skicka
- `OPENAI_API_KEY` saknas → returnera mock-svar med tydlig markering
- Varje AI-function (sms-draft, daily-brief, quote) ska fungera
  gracefully utan API-nyckel: returnera ett mock-objekt med
  `{ mock: true, content: "..." }`

---

## 8. Rekommenderad nästa implementation i huvudrepot

Ordningen är baserad på beroenden och verkstadsvärde:

### Fas 1: Grundläggande infrastruktur

1. **Shared storage-helper för Netlify Blobs**
   Skapa en `lib/blobs.js` med `getStore`, `getById`, `listAll`, `upsert`,
   `deleteById`. Alla Functions använder denna. Motsvarar prototypens
   `StorageAdapter`-interface.

2. **case_events / timeline**
   Append-only händelselogg per ärende. Varje statusbyte, notering,
   SMS-sändning loggas automatiskt. Ger ärendehistorik i admin-UI.

### Fas 2: Kommunikation

3. **sms_drafts**
   CRUD-function + koppling till Cloudflare Worker för faktisk sändning.
   Dry-run-stöd (SMS_DRY_RUN=true).

4. **call_logs**
   Webhook-mottagare från 46elks → loggar samtal till Blobs.
   Koppling till ärende om möjligt (matcha telefonnummer mot kund).

### Fas 3: AI-funktioner

5. **ai-sms-draft function**
   Genererar förslag på SMS-text baserat på ärende, status och kundhistorik.
   Mock om OPENAI_API_KEY saknas.

6. **ai-daily-brief function**
   Daglig sammanfattning: aktiva ärenden, obetalda, delar att beställa,
   uppföljningar. Kan levereras som SMS eller visas i admin.

7. **ai-quote function**
   Offertförslag baserat på problemtyp + prisdatabas.

### Fas 4: Admin-UI & arbetsflöden

8. **AI Kontrolltorn på /admin**
   Dashboard-vy i statisk HTML/JS som anropar Functions. Visar:
   - Ärendelista med status
   - Händelselogg/timeline per ärende
   - SMS-utkast med skicka/redigera
   - AI-rekommendationer med acceptera/avvisa
   - Daglig brief

9. **Reservdelsflöde (part_needs)**
   Skapa/uppdatera reservdelsbehov per ärende.
   Status: needed → ordered → received.

### Fas 5: Betalning & checkout

10. **Checkout-koppling (payments)**
    Betalningsposter per ärende med stöd för Swish/kort/kontant/faktura.
    Delbetalningar. Koppling till betalstatus på ärendet.

---

## 9. Build-resultat

```
$ npm run build

Next.js 16.2.1 (Turbopack)
Compiled successfully in 10.0s
TypeScript passed in 4.8s
Static pages generated (9/9) in 386ms

Route (app)
  /                 -- Instrumentpanel
  /_not-found
  /innehall         -- Innehallsideer
  /installningar    -- Installningar
  /jobb             -- Kunder & Jobb
  /offert           -- Offert
  /prisdatabas      -- Prisdatabas

All static. 0 errors. 0 warnings.
```

**Build-status: LYCKAD**

---

## 10. Branch/PR-status

| | Status |
|---|---|
| **Branch** | `claude/build-operations-mvp-HUBEL` |
| **Commits** | 4 + denna sammanfattning (5 totalt) |
| **Alla ändringar commitade** | Ja — `working tree clean` |
| **Allt pushat till remote** | Ja (efter denna commit) |
| **PR skapad** | Nej — ingen PR skapad, ingen ska skapas |
| **Mergeas** | **NEJ** — prototyp/referens, ej för merge |

### Commit-historik

```
e65d65a  Add prototype summary documenting Next.js/Supabase ops vs Netlify production
9a3baca  Add Supabase-ready storage adapter pattern and database schema
adaede4  Suppress hydration warning from browser extensions
a3295e1  feat: add Nordic E-Mobility internal operations MVP app
```

---

**Featureutveckling frusen. Inväntar ny instruktion.**
