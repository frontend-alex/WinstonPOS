import type { DiscoveredLead } from '@repo/db/leads';
import { JOBS, newsFeedJobSchema, officialNoticesJobSchema } from '@repo/queue';
import { XMLParser } from 'fast-xml-parser';
import { mapNewsItem, mapOfficialNotice } from './map-lead';

const SRU_URL = 'https://repository.overheid.nl/sru';
const PERMITS = [
  'exploitatievergunning',
  'alcoholwetvergunning',
  'drank- en horecavergunning',
];
const xml = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  htmlEntities: true,
  isArray: (name) => ['record', 'item', 'Punt'].includes(name),
});

export function discoverLeads(
  name: string,
  data: unknown,
): Promise<DiscoveredLead[]> {
  switch (name) {
    case JOBS.officialNotices:
      return fetchOfficialNotices(
        officialNoticesJobSchema.parse(data).lookbackDays,
      );
    case JOBS.newsFeed:
      return fetchNewsFeed(newsFeedJobSchema.parse(data).url);
    default:
      throw new Error(`Unknown job ${name}`);
  }
}

export async function fetchOfficialNotices(
  lookbackDays: number,
): Promise<DiscoveredLead[]> {
  const since = new Date(Date.now() - lookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const query = [
    'c.product-area="officielepublicaties"',
    'dt.type="Beschikkingen"',
    `(${PERMITS.map((term) => `cql.textAndIndexes="${term}"`).join(' OR ')})`,
    `dt.modified>="${since}"`,
  ].join(' AND ');
  const leads: DiscoveredLead[] = [];
  let start = 1;
  while (start) {
    const params = new URLSearchParams({
      query,
      maximumRecords: '100',
      startRecord: String(start),
    });
    const url = `${SRU_URL}?${params}`;
    const body = (await fetchXml(url)).searchRetrieveResponse;
    const total = Number(body?.numberOfRecords);
    if (!Number.isInteger(total) || total < 0 || body?.diagnostics) {
      throw new Error('Invalid official-notice response');
    }
    if (total > 0 && !body.records?.record?.length) {
      throw new Error('Source response is missing its records');
    }
    for (const record of body.records?.record ?? []) {
      const lead = mapOfficialNotice(record.recordData?.gzd, url);
      if (lead) leads.push(lead);
    }
    const next = Number(body.nextRecordPosition ?? 0);
    if (!Number.isInteger(next) || (next !== 0 && next <= start)) {
      throw new Error('Invalid source pagination');
    }
    start = next;
    if (start) await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return leads;
}

export async function fetchNewsFeed(url: string): Promise<DiscoveredLead[]> {
  const channel = (await fetchXml(url)).rss?.channel;
  if (!channel || typeof channel !== 'object')
    throw new Error('Invalid RSS response');
  const leads: DiscoveredLead[] = [];
  for (const item of channel.item ?? []) {
    const lead = mapNewsItem(item, url);
    if (lead) leads.push(lead);
  }
  return leads;
}

async function fetchXml(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok)
    throw new Error(`${new URL(url).host} answered ${response.status}`);
  return xml.parse(await response.text());
}
