import type { DiscoveredLead } from '@repo/db/leads';
import { extractLeadDetails } from './lead-details';

const NOT_A_PERMIT = /geluidsontheffing|evenement/i;
const NEWS_MATCH =
  /\bopen(t|en|ing)\b|nieuw(e)? (restaurant|zaak|eetcaf[eé]|lunchroom)/i;

export function mapNewsItem(
  // biome-ignore lint/suspicious/noExplicitAny: Provider XML is mapped here; persistence validates the shared model.
  item: any,
  sourceUrl: string,
): DiscoveredLead | undefined {
  const publishedAt = new Date(item.pubDate);
  if (
    !item.title ||
    !NEWS_MATCH.test(item.title) ||
    !item.link ||
    !item.pubDate ||
    Number.isNaN(publishedAt.getTime())
  )
    return undefined;
  const lead: DiscoveredLead = {
    source: 'news',
    externalId: item.guid ?? item.link,
    title: item.title,
    url: item.link,
    publishedAt,
  };
  const content =
    typeof item.encoded === 'string'
      ? item.encoded
      : typeof item.description === 'string'
        ? item.description
        : '';
  return extractLeadDetails(lead, content, sourceUrl);
}

export function mapOfficialNotice(
  // biome-ignore lint/suspicious/noExplicitAny: Provider XML is mapped here; persistence validates the shared model.
  gzd: any,
  sourceUrl: string,
): DiscoveredLead | undefined {
  const core = gzd?.originalData?.meta?.owmskern;
  if (!core?.title || NOT_A_PERMIT.test(core.title)) return undefined;
  const publishedAt = new Date(core.modified);
  if (!core.modified || Number.isNaN(publishedAt.getTime())) return undefined;
  const point = gzd.originalData.meta.tpmeta?.gebiedsmarkering?.Punt?.[0];
  const [lat, lng] = point?.locatiepunt?.trim().split(/\s+/).map(Number) ?? [];
  const validPoint =
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180;
  const lead: DiscoveredLead = {
    source: 'official-notice',
    externalId: core.identifier,
    title: core.title,
    url: gzd.enrichedData?.preferredUrl,
    publishedAt,
    issuingAuthority: core.creator,
    address:
      typeof point?.geometrielabel === 'string' &&
      /[\p{L}.'’-]+(?:\s+[\p{L}.'’-]+)*\s+\d{1,4}/u.test(point.geometrielabel)
        ? point.geometrielabel
        : undefined,
    ...(validPoint && { location: { type: 'Point', coordinates: [lng, lat] } }),
  };
  const result = extractLeadDetails(lead, '', sourceUrl);
  if (validPoint)
    result.details?.evidence.push({
      field: 'location',
      quote: point.locatiepunt,
      url: sourceUrl,
    });
  return result;
}
