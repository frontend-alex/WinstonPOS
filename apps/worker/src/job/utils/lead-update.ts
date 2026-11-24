import type { DiscoveredLead } from '@repo/db/leads';

export function buildLeadUpdate(lead: DiscoveredLead) {
  const unset: Partial<Record<'city' | 'address' | 'location', ''>> = {};
  for (const field of ['city', 'address', 'location'] as const) {
    if (lead[field] === undefined) unset[field] = '';
  }
  return {
    $set: lead,
    $setOnInsert: { review: 'candidate' as const, createdAt: new Date() },
    // Source facts may change; review status and creation time must not.
    ...(Object.keys(unset).length > 0 && { $unset: unset }),
  };
}
