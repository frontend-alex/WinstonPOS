import { type Lead, leadSchema } from '@repo/contracts';
import type { ObjectId } from '@repo/db';
import type { LeadDocument } from '@repo/db/leads';

export function toApiLead(document: LeadDocument & { _id: ObjectId }): Lead {
  return leadSchema.parse({
    ...document,
    // Legacy notices used the issuing authority as the city.
    ...(document.source === 'official-notice' &&
      !document.details?.evidence.some((item) => item.field === 'city') && {
        city: undefined,
      }),
    id: document._id.toHexString(),
    publishedAt: document.publishedAt.toISOString(),
    createdAt: document.createdAt.toISOString(),
  });
}
