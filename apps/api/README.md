# API

NestJS HTTP API. See the [root README](../../README.md) for setup and contracts.

- `GET /leads`: `ApiResponse<Lead[]>`.
- `POST /leads/scan`: HTTP 202, `ApiResponse<ScanQueued>`.
- `LeadsController` handles HTTP responses.
- `LeadsService.list()` reads MongoDB; `utils/map-lead.ts` serializes the result.
- `ScansService.scanNow()` enqueues work. Its bootstrap/shutdown hooks own daily
  schedule registration and queue cleanup.
- `utils/scan-jobs.ts` contains source/job definitions and Redis schedule setup.
- HTTP failures use Nest's normal handling; there is no custom error hierarchy.
- `ZodValidationPipe` is registered globally for request DTOs.
- The listener binds only to `127.0.0.1`.

From the repository root:

```sh
pnpm dev:api
pnpm build:api
pnpm --filter api check-types
pnpm --filter api lint
```
