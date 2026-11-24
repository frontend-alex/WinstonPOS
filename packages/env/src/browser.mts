import { createClientConfig } from "./client.mjs";

// Browser-only entry: `import.meta.env` is injected by Vite, so this module must
// not be imported from Node (vite.config.ts uses `@repo/env/client` instead).
const viteEnv = (import.meta as unknown as { env: Record<string, unknown> })
	.env;

export const config = createClientConfig(viteEnv);
export type { ClientConfig } from "./client.mjs";
