# Worker

NestJS background application context; it has no HTTP listener.
See the [root README](../../README.md) for setup.

1. BullMQ receives an official-notice or news-feed job.
2. `JobWorker.process()` calls `discoverLeads()`, `enrichLeads()`, then `leads.save()`.
3. `utils/discover-leads.ts` validates job payloads and fetches/paginates sources.
4. `utils/map-lead.ts` maps external XML to the shared model.
5. `utils/source-content.ts` handles permitted page retrieval and robots/budget checks.
6. `utils/lead-details.ts` extracts explicit business facts and source evidence.
7. Persistence validates and upserts source facts using the shared MongoDB model,
   preserving review status and original creation time.
8. `utils/lead-update.ts` builds the MongoDB update; the job returns
   `{ found, saved }` (new plus updated records). Discovery/storage
   failures propagate to BullMQ; unavailable enrichment falls back to source metadata.

Jobs run one at a time. Official-notice pagination waits two seconds between requests.
The uniqueness index on `(source, externalId)` prevents repeat scans from creating
duplicate candidates.
Page enrichment is limited to 20 pages per source job. Google News is feed-only;
unknown facts remain unknown. There is no business-site crawling or outreach.

```sh
pnpm exec turbo run dev --filter=worker
pnpm exec turbo run build --filter=worker
pnpm --filter worker check-types
pnpm --filter worker lint
```
