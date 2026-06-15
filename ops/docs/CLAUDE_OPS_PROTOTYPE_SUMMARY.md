# Claude Ops-prototyp — Sammanfattning & Referens

> **Status:** Prototyp / referensarkitektur. **Mergeas INTE direkt** till
> produktionsrepot.
>
> Detta dokument sammanfattar det Next.js-baserade ops-prototypbygget som
> ligger i `ops/`-katalogen, och förklarar varför det hålls separat från det
> produktionsnära systemet (statisk HTML/JS + Netlify Functions + Netlify Blobs
> + Cloudflare Worker för 46elks).

---

## 1. Bakgrund — två olika arkitekturer

| | **Produktionssystem (Codex)** | **Denna prototyp (Claude, `ops/`)** |
|---|---|---|
| Frontend | Statisk HTML/JS | Next.js (App Router) + React + TypeScript |
| Backend | Netlify Functions | Inget (klient-only i v1) |
| Lagring | Netlify Blobs | localStorage → adapter → (framtid) Supabase |
| SMS | Cloudflare Worker → 46elks | Förberedd i schema/env, ej implementerad |
| Styling | (eget) | Tailwind CSS, shadcn-stil, lucide-react |

Eftersom de två kodbaserna inte delar runtime, byggsystem eller
lagringsmodell, kan prototypens kod inte mergeas rakt av. Den är värdefull som
**referens för domänmodell, UI-flöden och datadesign**.

---

## 2. Vad som byggts (funktioner)

Ops-prototypen är ett mobilförst internt verkstadsystem på svenska med sex vyer:

1. **Instrumentpanel** — nyckeltal (aktiva jobb, väntar på betalning, nya
   leads, klara denna vecka, beräknad intäkt), snabbåtgärder, dagens fokus,
   samt en mock för "Importera bokning".
2. **Kunder & Jobb** — full CRUD för serviceärenden, sök, statusfilter,
   detaljvy, snabb status-/betalningsändring.
3. **Offert** — offertbyggare med autoberäknad summa och genererad svensk
   offerttext + kopiera-till-urklipp.
4. **Prisdatabas** — intern prislista med kategorier, sök och CRUD.
5. **Innehållsidéer** — enkel innehållsplanering med inläggshjälp
   (Hook / Problem / Lösning / Resultat / CTA).
6. **Inställningar** — företagsinfo, export/import av JSON, återställ demodata,
   platshållare för framtida Supabase/API/webhook-konfiguration.

Genomgående tema: mörkt skandinaviskt, mjuk grön accent, bärnsten för
väntelägen, dämpad röd för brådskande/obetalt.

---

## 3. Användbara filer som referens

Dessa filer är de mest värdefulla att läsa när motsvarande funktionalitet
ska byggas i produktionssystemet:

| Fil | Varför den är användbar |
|-----|--------------------------|
| `ops/src/lib/types.ts` | **Domänmodellen** — `CustomerJob`, `Quote`, `PricingItem`, `ContentIdea`, `AppSettings`, `BookingImportPayload`, samt alla status-/källa-enums. Direkt återanvändbar i vilken stack som helst. |
| `ops/src/lib/storage-adapter.ts` | `StorageAdapter`-interfacet — kontraktet som alla lagringsbackender uppfyller. Konceptuellt återanvändbart. |
| `ops/src/lib/adapters/local-storage-adapter.ts` | Referensimplementation av interfacet. |
| `ops/src/lib/adapters/supabase-adapter.ts` | Mappning mellan platt domänmodell och normaliserade tabeller (kund/ärende-split, offert/offertrader). |
| `ops/src/lib/storage.ts` | Affärslogik: `createCustomerJob`, `updateJobStatus`, `updatePaymentStatus`, `mapBookingPayloadToCustomerJob`, `importBooking`. |
| `ops/supabase/migrations/001_initial_ops_schema.sql` | Komplett datamodell i SQL — bra utgångspunkt om/när Supabase införs. |
| `ops/docs/DATABASE_SCHEMA.md` | Tabellbeskrivningar, ER-diagram, RLS-plan, säkerhetschecklista. |
| `ops/.env.example` | Variabelkarta (Supabase, OpenAI, 46elks). |

---

## 4. Hur storage-adaptern fungerar (konceptuellt)

Idén: **isolera all läs/skriv bakom ett interface**, så att backend kan bytas
utan att konsumerande kod ändras.

```
  UI-sidor
     │  (importerar getJobs/saveJob/…)
     ▼
  storage.ts  ──── sync-exports (localStorage, nuvarande app)
     │
     │  getAdapter()  ── väljer implementation via env
     ▼
  StorageAdapter (interface)
     ├── LocalStorageAdapter   (standard, ingen env)
     └── SupabaseAdapter       (om NEXT_PUBLIC_SUPABASE_URL satt)
```

Nyckelpunkter:
- `getAdapter()` är en **singleton** som väljer adapter utifrån env-variabel.
- Befintliga sidor använder **synkrona** funktioner (localStorage) — oförändrat.
- **Async-varianter** (`getJobsAsync`, `saveJobAsync`, …) går via adaptern och
  är tänkta för stegvis migration till en riktig backend.
- Bytet kräver inga ändringar i UI-komponenterna, bara i adapterlagret.

> **Det är detta *mönster* — inte själva koden — som är det överförbara
> värdet.** Samma adapteridé kan implementeras mot Netlify Blobs.

---

## 5. Tabeller som Supabase-migrationen skapar

`001_initial_ops_schema.sql` skapar **13 tabeller** (PostgreSQL):

| Tabell | Syfte |
|--------|-------|
| `customers` | Kunduppgifter (namn, telefon, e-post) |
| `service_cases` | Jobb/ärenden med statusflöde, pris, betalstatus, källa |
| `case_events` | Append-only händelselogg per ärende (statusbyten, noteringar) |
| `quotes` | Offerter kopplade till ärenden |
| `quote_parts` | Offertrader (delar) |
| `sms_drafts` | SMS-utkast/historik (46elks) |
| `call_logs` | Samtalslogg |
| `part_needs` | Delar att beställa |
| `price_rules` | Intern prisdatabas |
| `ai_recommendations` | Framtida AI-förslag |
| `content_ideas` | Innehållsplanering |
| `payments` | Betalningsposter (Swish/kort/kontant/faktura) |
| `app_settings` | Enradskonfiguration (företagsinfo) |

Plus: index på vanliga uppslag, `updated_at`-trigger, samt **RLS aktiverat på
alla tabeller** med tillåtande policy för `authenticated` (intern app).

---

## 6. Vad som INTE kan mergeas direkt till Netlify-repot

| Del | Varför inte |
|-----|-------------|
| Hela `ops/`-Next.js-appen | Produktionssystemet är statisk HTML/JS, inte Next.js. App Router, RSC och Turbopack-bygget passar inte in. |
| `storage.ts` + adapterlagret | Bygger på `localStorage`/Supabase. Produktionen använder Netlify Blobs via Functions — annan API-yta. |
| `supabase-adapter.ts` | Förutsätter Supabase-klient och PostgreSQL. Ingen Supabase i produktion i nuläget. |
| SQL-migrationen | Endast relevant om/när Supabase införs. |
| Tailwind/shadcn/lucide-beroenden | Produktionens statiska frontend har egen styling; npm-beroendena hör inte hemma där. |
| React-komponenter (`src/components/*`) | Kräver React-runtime + byggsteg som inte finns i statiska sidor. |

**Slutsats:** Behandla `ops/` som en **separat prototyp/referensapp**, inte
som en feature-branch att mergea.

---

## 7. Översätta konceptet till Netlify Functions + Netlify Blobs

Samma adaptermönster fungerar utmärkt mot Netlify Blobs. Skiss:

**a) Datamodellen** — kopiera enums och fältdefinitioner från `types.ts` rakt
av (ren TypeScript, ingen framework-koppling).

**b) Lagring via Netlify Blobs** — en blob-store per entitetstyp, t.ex.:

```js
// netlify/functions/jobs.js  (konceptuell skiss)
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("service_cases");      // motsvarar "tabell"
  if (req.method === "GET") {
    const { blobs } = await store.list();
    const jobs = await Promise.all(
      blobs.map((b) => store.get(b.key, { type: "json" }))
    );
    return Response.json(jobs);
  }
  if (req.method === "POST") {
    const job = await req.json();
    await store.setJSON(job.id, job);            // nyckel = id
    return Response.json(job, { status: 201 });
  }
};
```

**c) Adapter på klienten** — ersätt `localStorage`-anropen med `fetch` mot
Functions-endpoints. Interfacet (`StorageAdapter`) förblir identiskt:

```
StorageAdapter
  ├── LocalStorageAdapter   (offline/dev)
  └── NetlifyBlobsAdapter   (fetch → /.netlify/functions/*)
```

**d) Mappning Supabase-tabell → Blobs-store:**

| Supabase-tabell | Netlify Blobs-store | Nyckel |
|-----------------|---------------------|--------|
| `service_cases` | `service_cases` | `id` |
| `customers` | `customers` | `id` |
| `quotes` (+`quote_parts` inbäddat) | `quotes` | `id` |
| `price_rules` | `price_rules` | `id` |
| `content_ideas` | `content_ideas` | `id` |
| `app_settings` | `app_settings` | `"default"` |

> Blobs har ingen relationsmodell — bädda in barnentiteter (t.ex. offertrader
> i offert-JSON) istället för separata tabeller. Händelseloggar
> (`case_events`) kan lagras som append i en lista per ärende eller som egna
> blobbar med prefix `case/<id>/events/`.

**e) 46elks** — befintlig Cloudflare Worker behålls. SMS-utkast (motsvarande
`sms_drafts`) kan ligga i en egen Blobs-store och skickas vidare till workern.

---

## 8. Rekommenderad migration om ni senare byter till Supabase

Om/när relationsdata, samtidig åtkomst eller rapportering blir för
omständligt med Blobs:

1. **Provisionera Supabase** och kör `001_initial_ops_schema.sql` som första
   migration (inga destruktiva operationer).
2. **Verifiera RLS** enligt `docs/DATABASE_SCHEMA.md` — service role-nyckeln får
   **aldrig** exponeras i klienten; admin-data (priser, inställningar) skrivs
   bara av admin-roll.
3. **Implementera en `SupabaseAdapter`** mot samma `StorageAdapter`-interface
   (referens finns redan i `ops/src/lib/adapters/supabase-adapter.ts`).
4. **Migrera data** från Netlify Blobs → Supabase med ett engångsskript
   (läs alla blobbar, mappa till tabeller, `insert`).
5. **Växla adapter** via env-variabel — UI:t påverkas inte.
6. **Behåll Blobs/Functions** som fallback tills Supabase är verifierad i drift.

---

## 9. Beslut

- ✅ Prototypen bevaras i `ops/` som referens.
- ⛔ Ingen merge till produktionsrepot.
- ⛔ Ingen ytterligare featureutveckling utan ny instruktion.
- 📄 Domänmodell + adaptermönster + SQL-schema är det överförbara värdet.
