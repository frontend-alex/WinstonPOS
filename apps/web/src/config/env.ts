import { createClientConfig } from "@repo/env/client";

const config = createClientConfig(import.meta.env);

export const env = Object.freeze({
	MAPBOX_ACCESS_TOKEN: config.VITE_MAPBOX_ACCESS_TOKEN,
});
