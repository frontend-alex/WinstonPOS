# Opening Radar

pnpm/Turborepo workspace with a React + TypeScript Vite frontend and a shared
shadcn/ui package using the **Rhea** style, Base UI, and Tailwind CSS v4.

## Start everything

```sh
pnpm install
pnpm dev
```

The root command builds shared server dependencies, then starts:

- Web: **http://127.0.0.1:5173**
- API: **http://127.0.0.1:3000** by default (`PORT` in the root environment).

MongoDB must be running and reachable using `MONGODB_URI`. The command does not
start a database server. Both application servers bind only to loopback.
Stop a standalone `pnpm dev:web` or `pnpm dev:api` before starting everything:
running two copies can cause a port conflict. Use Ctrl+C to stop the root command.
Web and API source files are watched. Shared `env`/`db` packages are built once
before startup; restart `pnpm dev` after editing those packages or root env files.

## Start the frontend

Use the Node and pnpm versions specified in the root `package.json`.

```sh
pnpm install
pnpm dev:web
```

Open **http://127.0.0.1:5173**. The frontend binds only to loopback and fails
explicitly if the port is occupied. No API keys are required for this starter.

The starter page checks React interactivity and light/dark styles. It is not a
working discovery pipeline and does not yet connect to a backend.

## Frontend structure

```text
apps/web/
  components.json          # Routes shadcn additions into @repo/ui
  vite.config.ts           # React and Tailwind plugins
  src/App.tsx              # Minimal starter page
  src/main.tsx             # React entry point
  src/style.css            # Imports shared theme CSS
packages/ui/
  components.json          # base-rhea / neutral / lucide
  src/components/          # Generated shadcn components
  src/lib/utils.ts
  src/styles/globals.css   # Shared tokens, fonts, and Tailwind sources
```

The frontend setup does not yet connect to the separate backend. The obsolete
`apps/docs` starter has been removed; the active applications are `web` and `api`.

## Add shared components

Run from the repository root:

```sh
pnpm dlx shadcn@latest add input --cwd apps/web
```

The matching `components.json` aliases place shared primitives in `packages/ui`,
not in the application. Import them through the workspace package:

```tsx
import { Button } from "@repo/ui/components/button";
```

## Verify the frontend

```sh
pnpm --filter web check-types
pnpm --filter @repo/ui check-types
pnpm --filter web lint
pnpm --filter @repo/ui lint
pnpm --filter web build
```

The theme was initialized with the official shadcn `rhea` preset. Both workspaces
use `style: "base-rhea"`, neutral tokens, Lucide icons, and a locally bundled Inter
font. There is no external font request.

## Server environment and MongoDB

Two server-only workspace packages are available:

- `@repo/env`: `packages/env/src/config.ts` uses the workspace loader for the
  **root** `.env` and `.env.local`, validates them against
  `packages/env/src/schema.ts`, and exports an immutable, typed `config` object.
- `@repo/db`: one reusable MongoDB driver connection pool, a startup ping, and
  graceful shutdown. The database is selected from the MongoDB URI.

For a fresh clone, copy `.env.example` to `.env` and set `MONGODB_URI` to your
database URL, including the database name. The initial local default is
`mongodb://127.0.0.1:27017/opening_radar`; **this does not install or start MongoDB**.
Precedence is: existing process environment → `.env.local` → `.env`. The loader
supports pnpm workspace discovery and a package-location fallback when the
caller runs outside the workspace.

| Variable | Validation |
| --- | --- |
| `MONGODB_URI` | Required; `mongodb://` or `mongodb+srv://` scheme, then driver-level URI/connection validation. |
| `PORT` | Integer from 1–65535; defaults to 3000. |
| `NODE_ENV` | `development`, `test`, or `production`; defaults to `development`. |

Start the API and build its workspace dependencies automatically:

```sh
pnpm dev:api
```

The API connects to MongoDB before listening on `127.0.0.1`. Startup fails if
configuration is invalid or the database cannot be reached. Shutdown closes the
pool. No collection is created and no application data is inserted by setup.

Use configuration from any **server-side** workspace that declares `@repo/env`
as a dependency:

```ts
import { config } from "@repo/env/config";

const port = config.PORT;
```

Do not read `process.env` elsewhere or import this configuration into browser
code. Package exports explicitly block browser imports; MongoDB URLs can contain
credentials. Add future server variables to the shared Zod schema, not ad hoc
parsing in each app. Frontend variables will need a separate explicitly public
schema when required.

In Nest services, inject the connected database rather than creating clients:

```ts
import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@repo/db";
import { MONGODB_DATABASE } from "./database/database.module";

@Injectable()
export class ExampleService {
  constructor(@Inject(MONGODB_DATABASE) private readonly database: Db) {}
}
```

Other server processes can call `connectDatabase()` from `@repo/db` and must call
`closeDatabase()` on shutdown. Each process owns its own pool.

### Build and test the server packages

```sh
pnpm build:api
pnpm --filter @repo/env test
pnpm --filter @repo/db test
pnpm --filter api test --runInBand
pnpm --filter api test:e2e --runInBand
```

The env tests use isolated temporary `.env` fixtures. Database connection tests
mock driver operations, and the HTTP test overrides the database provider; these
do not prove connectivity to a live database. A real startup against your chosen
database is a separate integration check.

## Request validation with Zod

The API registers `nestjs-zod`'s `ZodValidationPipe` globally through `APP_PIPE`
in `apps/api/src/app.module.ts`. It does not use Nest's built-in `ValidationPipe`
and does not require `class-validator` or `class-transformer`.

Define request DTOs using `createZodDto`, and use the DTO class as the parameter
type (not a type-only import, so Nest can read its runtime metadata):

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

class CreateExampleDto extends createZodDto(
  z.strictObject({
    name: z.string().trim().min(1),
    seats: z.coerce.number().int().positive(),
  }),
) {}

@Controller("examples")
export class ExampleController {
  @Post()
  create(@Body() body: CreateExampleDto) {
    return body;
  }
}
```

This is a usage example, not an installed production endpoint. Use the same DTO
pattern for `@Query()` and `@Param()`. Use `z.strictObject` to reject unknown keys;
plain `z.object` strips them by default. Declare coercions/transforms explicitly
in each schema; Zod does not reproduce class-transformer's implicit conversions.
Requests without Zod DTOs are not automatically validated by this pipe.

Invalid requests return HTTP 400. Environment validation remains in `@repo/env`
and is independent of request validation.
