import { fileURLToPath, URL } from "node:url";
import { createClientConfig } from "@repo/env/client";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const envDir = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig(({ mode }) => {
	createClientConfig(loadEnv(mode, envDir, "VITE_"));

	return {
		envDir,
		plugins: [react(), tailwindcss()],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		optimizeDeps: {
			// Patched via pnpm (patches/): serve it as-is so patch changes show without --force.
			exclude: ["@zerowing/liquid-glass"],
		},
		server: {
			host: "127.0.0.1",
			port: 5173,
			strictPort: true,
		},
	};
});
