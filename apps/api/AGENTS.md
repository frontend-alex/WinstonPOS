# API — Agent Guide

Follow the [root instructions](../../AGENTS.md). This is Opening Radar's NestJS backend, not a POS or outreach service.
Keep this file at **60 lines maximum**.

## Stack and layout
- NestJS 11, Express, TypeScript/NodeNext, MongoDB, Zod 4, Jest/Supertest.
- `src/main.ts`: bootstrap, shutdown hooks, logging, loopback listener using `env.API_PORT`.
- `src/create-app.ts`: creates the Nest application and configures CORS; does not listen.
- `src/app.module.ts`: imports `DatabaseModule`; registers global `ZodValidationPipe` through `APP_PIPE`.
- `src/config/env.ts`: immutable API mapping over shared validated configuration.
- `src/database/database.module.ts`: global database provider and shutdown cleanup.
- `src/common/`: currently empty; reserve for genuinely shared API utilities.
- `test/app.e2e-spec.ts`: HTTP validation tests with test-only routes and a mocked database.
- `tsconfig.json`: extends `@repo/typescript-config/nest.json`; build config excludes tests.
- `dist/`: generated output; never edit directly.
- No production controllers exist yet; `GET /` returning 404 is expected.

## Environment and database
- `@repo/env` loads root `.env`/`.env.local` and validates through its shared Zod schema.
- Precedence: process environment → `.env.local` → `.env`.
- API mapping: `API_PORT`, `NODE_ENV`, `DATABASE_URL` (alias for shared `MONGODB_URI`).
- Do not duplicate validation with `ConfigModule.forRoot()` or another env loader.
- Add variables to the shared schema; align mappings, tests, examples, and Turbo env declarations.
- Known gaps: CORS reads unvalidated `WEB_ORIGIN`; Turbo/examples may still use `PORT`, not `API_PORT`.
- Never log secrets, expose config through HTTP, or import server config into browser code.
- Inject `Db` from `@repo/db` using `MONGODB_DATABASE`; do not create per-request clients.
- Shared DB code owns pooling, connection/ping, and cleanup; Nest closes it on shutdown.
- MongoDB must already be reachable; API startup does not start it or seed data.

## Request validation and features
- Use `createZodDto(schema)` from `nestjs-zod` for body, query, and route DTOs.
- Import DTO classes as runtime values, not `import type`; Nest needs their metadata.
- Prefer `z.strictObject()` to reject unknown keys; plain `z.object()` strips them.
- Declare coercion/transforms explicitly; interfaces and primitive types are not automatically validated.
- Do not add `class-validator`, `class-transformer`, or Nest's built-in `ValidationPipe`.
- Keep controllers thin, business logic in services, and database access in services/repositories.
- Group approved features under `src/<feature>/` with a module, controller, service, DTOs, and tests.
- Register feature modules in `AppModule`; do not invent endpoints or expand product scope.

## Commands — run from repository root
```sh
pnpm dev:api
pnpm build:api
pnpm --filter api exec tsc --noEmit --incremental false
pnpm --filter api test --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter api lint
```
- `pnpm dev` starts API and web; avoid duplicate processes on the same ports.
- Root commands build shared dependencies; restart dev after shared-package or env changes.
- API `lint` runs non-mutating Biome checks; apply fixes only to intended files.

## Testing and safety
- Unit specs live beside source; HTTP specs live in `test/`.
- Mock shared config and override `MONGODB_DATABASE`; ordinary tests must not contact real databases.
- Test valid/invalid inputs, unknown fields, and transformations; mocked tests do not prove live connectivity.
- Keep unauthenticated development loopback-only; preserve user work and report actual verification results.
