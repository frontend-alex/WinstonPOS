import { z } from "zod";

export const scanQueuedSchema = z.object({
	queued: z.number().int().nonnegative(),
});
export type ScanQueued = z.infer<typeof scanQueuedSchema>;

export const scanResultSchema = z.object({
	found: z.number().int().nonnegative(),
	saved: z.number().int().nonnegative(),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
