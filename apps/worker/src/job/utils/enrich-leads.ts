import { Logger } from '@nestjs/common';
import type { DiscoveredLead } from '@repo/db/leads';
import { extractLeadDetails } from './lead-details';
import { readSourcePage, type SourceFetchState } from './source-content';

export async function enrichLeads(
  leads: DiscoveredLead[],
): Promise<DiscoveredLead[]> {
  const state: SourceFetchState = { policies: new Map(), pages: 0 };
  const enriched: DiscoveredLead[] = [];
  for (const lead of leads) {
    const page = await readSourcePage(lead.url, state);
    try {
      enriched.push(
        page ? extractLeadDetails(lead, page.body, page.url, true) : lead,
      );
    } catch {
      if (page) state.policies.set(new URL(page.url).origin, null);
      Logger.warn(
        'Source-page enrichment unavailable; retaining source metadata.',
        'SourceEnrichment',
      );
      enriched.push(lead);
    }
  }
  return enriched;
}
