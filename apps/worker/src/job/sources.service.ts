import { setTimeout as sleep } from 'node:timers/promises';
import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import type { Lead } from './leads.service';

const SRU_URL = 'https://repository.overheid.nl/sru';
const PERMITS = [
  'exploitatievergunning',
  'alcoholwetvergunning',
  'drank- en horecavergunning',
];
const NOT_A_PERMIT = /geluidsontheffing|evenement/i;
const NEWS_MATCH =
  /\bopen(t|en|ing)\b|nieuw(e)? (restaurant|zaak|eetcaf[eé]|lunchroom)/i;

const xml = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  htmlEntities: true, // "euro&#39;s" → "euro's"
});

// XML gives a single object for one element and an array for several.
// biome-ignore lint/suspicious/noExplicitAny: parsed XML has no static type.
const list = (value: any): any[] => (value ? [value].flat() : []);

@Injectable()
export class SourcesService {
  async officialNotices(lookbackDays: number): Promise<Lead[]> {
    const since = new Date(Date.now() - lookbackDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const query = [
      'c.product-area="officielepublicaties"',
      'dt.type="Beschikkingen"',
      `(${PERMITS.map((term) => `cql.textAndIndexes="${term}"`).join(' OR ')})`,
      `dt.modified>="${since}"`,
    ].join(' AND ');

    const leads: Lead[] = [];
    let start = 1;
    while (start) {
      const params = new URLSearchParams({
        query,
        maximumRecords: '100',
        startRecord: String(start),
      });
      const body = xml.parse(
        await this.get(`${SRU_URL}?${params}`),
      ).searchRetrieveResponse;

      for (const record of list(body.records?.record)) {
        const lead = this.noticeToLead(record.recordData.gzd);
        if (lead) leads.push(lead);
      }

      start = Number(body.nextRecordPosition) || 0;
      if (start) await sleep(2_000); // one request every 2 seconds
    }
    return leads;
  }

  async newsFeed(url: string): Promise<Lead[]> {
    const items = list(xml.parse(await this.get(url)).rss?.channel?.item);
    return items
      .filter((item) => item.title && item.link && NEWS_MATCH.test(item.title))
      .map((item) => ({
        source: 'news',
        externalId: item.guid ?? item.link,
        title: item.title,
        url: item.link,
        publishedAt: new Date(item.pubDate ?? Date.now()),
      }));
  }

  // Field paths taken from a live response.
  // biome-ignore lint/suspicious/noExplicitAny: parsed XML has no static type.
  private noticeToLead(gzd: any): Lead | undefined {
    const core = gzd.originalData.meta.owmskern;
    if (NOT_A_PERMIT.test(core.title)) return undefined;

    const point = list(gzd.originalData.meta.tpmeta?.gebiedsmarkering?.Punt)[0];
    const [lat, lng] = point?.locatiepunt?.split(' ').map(Number) ?? [];
    return {
      source: 'official-notice',
      externalId: core.identifier,
      title: core.title,
      url: gzd.enrichedData.preferredUrl,
      publishedAt: new Date(core.modified),
      city: core.creator,
      ...(point?.geometrielabel && { address: point.geometrielabel }),
      ...(lat &&
        lng && { location: { type: 'Point', coordinates: [lng, lat] } }),
    };
  }

  private async get(url: string): Promise<string> {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      throw new Error(`${new URL(url).host} answered ${response.status}`);
    }
    return response.text();
  }
}
