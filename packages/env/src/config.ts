import { loadRootEnv } from "./index.js";
import { validateEnv } from "./schema.js";

loadRootEnv();

export const config = validateEnv(process.env);
export type { Config } from "./schema.js";
