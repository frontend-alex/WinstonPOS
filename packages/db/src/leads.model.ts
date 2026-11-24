import { leadSchema } from "@repo/contracts";
import type { Db } from "mongodb";
import { z } from "zod";

// Same lead fields as the API, but MongoDB stores real dates and supplies _id.
export const leadDocumentSchema = leadSchema.omit({ id: true }).extend({
	publishedAt: z.date(),
	createdAt: z.date(),
});
export type LeadDocument = z.infer<typeof leadDocumentSchema>;

// Source connectors supply these fields; persistence adds review and createdAt.
export const discoveredLeadSchema = leadDocumentSchema.omit({
	review: true,
	createdAt: true,
});
export type DiscoveredLead = z.infer<typeof discoveredLeadSchema>;

export function leadsCollection(db: Db) {
	return db.collection<LeadDocument>("leads");
}
