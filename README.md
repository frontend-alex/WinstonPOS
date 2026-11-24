# Opening Radar

A local demo for discovering restaurant-opening signals for Winston POS.
It is not a POS system or an automated outreach tool.

## How it works

```text
POST /leads/scan → Redis queue → worker → MongoDB leads collection
GET /leads      ← API reads the collection
```

- **API:** queues scans and returns saved candidates.
- **Worker:** reads configured official-notice and RSS sources, extracts sales
  details from their content, validates the results, and upserts candidates.
  It is a background process, not an HTTP server.
- **Web:** fetches saved leads through the shared Axios client and displays them
  in the list and map. Leads without coordinates stay in the list only.

The existing daily jobs run at 06:00 Europe/Amsterdam. Manual scans enqueue one
official-notice job and two news-feed jobs in one bulk operation.

## Follow a scan through the code

1. **Click Scan sources** — `apps/web/src/features/map/components/leads-panel.tsx`
   calls `scanSources()` in `features/map/api/map.ts`.
2. **HTTP request** — Axios sends `POST /leads/scan`.
3. **Controller** — `apps/api/src/leads/leads.controller.ts` calls `ScansService.scanNow()`.
4. **Queue service** — `apps/api/src/leads/scans.service.ts` builds jobs and calls
   `queue.addBulk()`. HTTP 202 means queued, not finished.
5. **Worker** — `apps/worker/src/job/job.worker.ts` processes each Redis job:

   ```ts
   const discovered = await discoverLeads(job.name, job.data);
   const enriched = await enrichLeads(discovered);
   return this.leads.save(enriched);
   ```

6. **Utilities** — `apps/worker/src/job/utils/` contains discovery/pagination,
   XML mapping, permitted page retrieval, evidence extraction, and DB update mapping.
7. **Save** — the worker's `LeadsService.save()` validates the shared model and
   upserts source facts into MongoDB.
8. **Read back** — Refresh calls `GET /leads` → API `LeadsService.list()` →
   MongoDB → `toApiLead()` → `ApiResponse<Lead[]>` → cards and map.

**Scheduling uses the same pipeline.** API `ScansService.onApplicationBootstrap()`
calls `registerDailyScans()` from `leads/utils/scan-jobs.ts`. Redis owns the daily
schedules and sends the same job kinds to the same worker. The API does not import
or directly call worker code.

Controllers only handle HTTP, services own the queue/database, and utilities hold
the source-specific fetching and mapping. There are no strategy registries,
generic pipeline frameworks, or extra response/error class hierarchies.

## Shared contracts

`packages/contracts` is the browser-safe `@repo/contracts` package.
Successful API handlers use the same envelope, matching ScaleLab:

```ts
// packages/contracts/src/common/api.contract.ts
export type ApiResponse<T = null> = {
  data: T;
  message: string;
};
```

| Request | Status | Response type |
| --- | --- | --- |
| `GET /leads` | 200 | `ApiResponse<Lead[]>` |
| `POST /leads/scan` | 202 | `ApiResponse<ScanQueued>` |

```json
{ "data": { "queued": 3 }, "message": "Scan queued" }
```

A 202 means jobs were queued, **not** that scraping finished. Fetch `/leads` again
after the worker processes them. An empty collection returns `data: []`.
All saved leads are returned, newest source timestamp first.

Controllers return the envelope explicitly. HTTP failures use Nest's normal error
handling. There is no separate API error type, response inheritance, or response
interceptor.

### One lead definition

- `packages/contracts/src/leads/lead.contract.ts`: `leadSchema` defines the public
  fields; `Lead` is inferred from it. IDs and ISO dates are strings in JSON.
- `packages/db/src/leads.model.ts`: `LeadDocument` is derived from that schema,
  with MongoDB dates instead of strings. MongoDB supplies `_id`.
- `DiscoveredLead` is the same model before persistence adds `review: "candidate"`
  and `createdAt`.
- Both processes use `leadsCollection(db)` from `@repo/db/leads`.
- The API converts `_id` to `id`, serializes dates, and parses the result through
  `leadSchema`, which strips undeclared database fields.

The frontend can import `ApiResponse`, `Lead`, and `ScanQueued` directly.
For runtime validation of a successful response, use
`apiResponseSchema(leadSchema.array())`. Check HTTP status before parsing a success
payload; Axios rejects unsuccessful HTTP responses.

Sources fetch XML and map it to leads; persistence validates the mapped batch
before writing. Missing/invalid publication dates are skipped rather than invented.
The worker upserts by `(source, externalId)`. Rescans refresh source facts and
clear stale location fields, but preserve review status and original creation time.
These are **source candidates**, not verified restaurant openings or contacts.

### Sales details and evidence

Expanded cards show business name, concept, opening timing, address/city, public
business website/phone/email, and a named business owner/founder when the source
explicitly identifies one. Missing values stay **Unknown**.

- `Lead.details` is part of the shared contract, not a separate frontend model.
- The worker reads RSS descriptions/full-content fields and notice metadata.
- The `enrichLeads()` / `readSourcePage()` utilities can retrieve the discovered page on the existing government
  and Omroep Brabant hosts: at most **20 pages per source job**, sequentially, with
  robots rules/crawl delays, timeouts, a 1 MB response limit, and no cross-origin redirects.
- Google News stays feed-only. No arbitrary publisher, linked business website,
  sitemap, or contact-page crawling is added.
- Extraction uses restaurant-specific JSON-LD, explicit Dutch business labels,
  and literal opening/location statements. Publisher/author/footer contacts are
  not business contacts. Ambiguous multi-business pages do not get assigned contacts.
- Evidence includes the field, source excerpt, and URL; source checking is timestamped.
  Feed facts cite the fetched feed, not a publisher page we did not read.
- Opening timing preserves the source's wording instead of inventing a precise date.
- No LLM/API key, hidden enrichment provider, geocoding, personal contact guessing,
  email sending, or automatic qualification/priority score is used.
- Source excerpts are displayed as escaped text; source HTML is never rendered.
- Robots rules are technical access rules, not a substitute for reviewing source
  licensing/terms. Restricted, unavailable, or over-budget pages remain feed-only.

Use **Scan sources**, then **Refresh** after the background jobs finish. Existing
records gain details when rediscovered; this does not bulk-migrate or fetch every
historic record just by starting the app.

## Layout

```text
apps/api/src/leads/       HTTP controller and API service
apps/api/src/leads/utils/ API mapping, job definitions, daily scheduling
apps/worker/src/job/      Three-step worker and database service
apps/worker/src/job/utils/ Discovery, scraping, mapping, evidence extraction
apps/web/src/features/    Map preview, sidebar, and settings
packages/contracts/      Shared JSON schemas and inferred types
packages/db/             MongoDB connection and shared lead model
packages/queue/          BullMQ setup, job names, and payload schemas
packages/env/            Validated server/public configuration
packages/ui/             Shared shadcn/Base UI components
```

## Run locally

Use the Node and pnpm versions declared in `package.json`.

```sh
pnpm install
cp .env.example .env
docker compose up -d redis
```

Configure `MONGODB_URI` with a reachable MongoDB database, including its name.
Compose starts **only Redis**, not MongoDB. For the web preview, also configure a
public Mapbox `pk.*` token in `VITE_MAPBOX_ACCESS_TOKEN`.

```sh
pnpm dev
```

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3000` (`API_PORT`)
- Worker: background process, no port

For the backend only:

```sh
pnpm exec turbo run dev --filter=api --filter=worker
```

Shared packages build before the applications start. Restart dev processes after
changing shared packages or root environment files.
Configuration precedence is process environment → `.env.local` → `.env`.
`WEB_ORIGIN` defaults to `http://127.0.0.1:5173`. CORS also allows both
`http://localhost:5173` and `http://127.0.0.1:5173` for local development.
Never import server configuration or database packages into browser code.
This unauthenticated demo must remain loopback-only: no public deployment or tunnel.

```sh
curl -X POST http://127.0.0.1:3000/leads/scan
curl http://127.0.0.1:3000/leads
```

## Verify

```sh
pnpm exec turbo run build --filter=api --filter=worker
pnpm --filter api check-types
pnpm --filter worker check-types
pnpm --filter @repo/db test
pnpm --filter api lint
pnpm --filter worker lint
pnpm --filter @repo/contracts lint
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web build
```

Only database-connection tests remain in the working tree. API/worker test
commands currently find no tests; they do not prove HTTP or live-pipeline behavior.

### Known limits

- The web loads on mount/manual refresh; queueing a scan does not report completion
  or automatically poll for progress.
- Extraction is conservative and only fills explicitly supported fields. Many
  sources do not publish contacts, business details, or an opening date.
- Official-notice `publishedAt` is its modification timestamp, not an opening date.
  The issuing authority is stored separately and is never used as the city.
- Candidates have no working review endpoint/UI yet.
- The planning documents referenced by root `AGENTS.md` are missing from this
  checkout; this refactor does not claim their acceptance criteria are satisfied.
- Builds and mocked checks do not prove live source coverage, MongoDB/Redis
  connectivity, extraction accuracy across every publisher format, or permission
  to ingest a source.
- Invalid existing database rows fail output validation with a safe 500; they are
  not silently changed, dropped, or migrated.
