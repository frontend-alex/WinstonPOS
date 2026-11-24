import { z } from "zod";

export const leadFactSchema = z.enum([
	"businessName",
	"concept",
	"openingWindow",
	"address",
	"city",
	"website",
	"phone",
	"email",
	"contactName",
	"contactRole",
	"summary",
	"location",
]);
export type LeadFact = z.infer<typeof leadFactSchema>;

export const leadDetailsSchema = z.object({
	businessName: z.string().optional(),
	concept: z.string().optional(),
	openingWindow: z.string().optional(),
	website: z.url({ protocol: /^https?$/ }).optional(),
	phone: z.string().optional(),
	email: z.email().optional(),
	contactName: z.string().optional(),
	contactRole: z.string().optional(),
	summary: z.string().optional(),
	status: z.enum(["source-only", "enriched"]),
	note: z.string().optional(),
	checkedAt: z.iso.datetime(),
	evidence: z.array(
		z.object({
			field: leadFactSchema,
			quote: z.string().min(1).max(600),
			url: z.url({ protocol: /^https?$/ }),
		}),
	),
});
export type LeadDetails = z.infer<typeof leadDetailsSchema>;

export const leadSchema = z.object({
	id: z.string().min(1),
	source: z.enum(["official-notice", "news"]),
	externalId: z.string().trim().min(1),
	title: z.string().trim().min(1),
	url: z.url({ protocol: /^https?$/ }),
	publishedAt: z.iso.datetime(),
	city: z.string().optional(),
	address: z.string().optional(),
	issuingAuthority: z.string().optional(),
	details: leadDetailsSchema.optional(),
	location: z
		.object({
			type: z.literal("Point"),
			coordinates: z.tuple([
				z.number().min(-180).max(180),
				z.number().min(-90).max(90),
			]),
		})
		.optional(),
	review: z.literal("candidate"),
	createdAt: z.iso.datetime(),
});

export type Lead = z.infer<typeof leadSchema>;
