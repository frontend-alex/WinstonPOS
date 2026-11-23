# Opening Radar

pnpm/Turborepo workspace with a React + TypeScript Vite frontend and a shared
shadcn/ui package using the **Rhea** style, Base UI, and Tailwind CSS v4.

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

The frontend setup does not implement or connect the separate backend.
The vanilla `apps/docs` starter still imports removed legacy UI files and needs
migration or removal before its own build can pass. Use the filtered commands
below to verify this React frontend independently.

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
