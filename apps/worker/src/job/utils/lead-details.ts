import {
  type LeadDetails,
  type LeadFact,
  leadDetailsSchema,
} from '@repo/contracts';
import type { DiscoveredLead } from '@repo/db/leads';
import { load } from 'cheerio';

const BUSINESS_TYPES = new Set([
  'Restaurant',
  'FoodEstablishment',
  'CafeOrCoffeeShop',
  'BarOrPub',
  'Bakery',
]);
const OPENING = /\b(opent|openen|opening|geopend|open gaat|gaan open)\b/i;
const TIMING =
  /\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|20\d{2}|vandaag|morgen|binnenkort|volgende week|volgende maand|dit najaar|dit voorjaar|deze zomer|deze winter)\b/i;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function website(value: unknown): string | undefined {
  try {
    const url = new URL(clean(value));
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

// This is provider JSON, not a second lead model. Only explicitly named business
// entities are used; NewsArticle.publisher/author and page-footer contacts are not.
// biome-ignore lint/suspicious/noExplicitAny: JSON-LD has arbitrary provider-defined properties.
function entities(value: any): any[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(entities);
  return [value, ...Object.values(value).flatMap(entities)];
}

export function extractLeadDetails(
  lead: DiscoveredLead,
  html: string,
  sourceUrl = lead.url,
  fullPage = false,
): DiscoveredLead {
  const $ = load(html);
  const headline = fullPage ? clean($('h1').first().text()) : lead.title;
  const nodes = $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((element) => {
      try {
        return entities(JSON.parse($(element).text()));
      } catch {
        return [];
      }
    });
  const details: LeadDetails = {
    ...(fullPage ? lead.details : {}),
    status: fullPage ? 'enriched' : 'source-only',
    checkedAt: new Date().toISOString(),
    evidence: fullPage ? [...(lead.details?.evidence ?? [])] : [],
  };
  if (fullPage) delete details.note;
  const result: DiscoveredLead = { ...lead, details };
  const extracted = new Set<LeadFact>();
  const fact = (field: LeadFact, value: unknown, quote = clean(value)) => {
    const text = clean(value);
    if (!text || !quote || text.length > 600) return;
    if (field === 'address' || field === 'city') result[field] = text;
    else if (field !== 'location') details[field] = text;
    extracted.add(field);
    details.evidence = details.evidence.filter((item) => item.field !== field);
    details.evidence.push({
      field,
      quote: quote.slice(0, 600),
      url: sourceUrl,
    });
  };

  if (
    nodes.some(
      (node) =>
        node.isAccessibleForFree === false ||
        node.isAccessibleForFree === 'false',
    ) ||
    /nosnippet|noarchive/i.test($('meta[name="robots"]').attr('content') ?? '')
  ) {
    return {
      ...lead,
      details: {
        ...details,
        status: 'source-only',
        note: 'The publisher restricts this content. Review the original source.',
      },
    };
  }

  $(
    'script, style, nav, footer, header, aside, form, [hidden], [aria-hidden="true"], .paywall',
  ).remove();
  const selector = [
    '[itemprop="articleBody"]',
    '#broodtekst',
    '.zakelijke-mededeling-tekst',
    'article',
    'main',
  ].find((selector) => $(selector).length);
  const content = selector ? $(selector).first() : fullPage ? null : $.root();
  $('br').replaceWith('\n');
  const paragraphs =
    content
      ?.find('p, h1, h2, h3, li, tr')
      .toArray()
      .flatMap((element) =>
        $(element).is('tr')
          ? [
              $(element)
                .find('th, td')
                .toArray()
                .map((cell) => clean($(cell).text()))
                .join(': '),
            ]
          : $(element).text().split('\n').map(clean),
      )
      .filter(Boolean) ?? [];
  if (content && !paragraphs.length) paragraphs.push(clean(content.text()));
  const text = paragraphs.join('\n');

  const businesses = nodes.filter((node) => {
    const types = Array.isArray(node['@type'])
      ? node['@type']
      : [node['@type']];
    return (
      types.some((type: string) => BUSINESS_TYPES.has(type)) && clean(node.name)
    );
  });
  // Multiple businesses in one article cannot safely be assigned to one lead.
  const names = new Set(businesses.map((business) => clean(business.name)));
  const candidate = names.size === 1 ? businesses[0] : undefined;
  const business =
    candidate &&
    `${headline} ${text}`
      .toLocaleLowerCase()
      .includes(clean(candidate.name).toLocaleLowerCase())
      ? candidate
      : undefined;
  if (names.size > 1)
    details.note =
      'Multiple businesses are mentioned; verify which one this signal concerns.';
  if (business) {
    fact('businessName', business.name);
    fact(
      'concept',
      Array.isArray(business.servesCuisine)
        ? business.servesCuisine.map(clean).filter(Boolean).join(', ')
        : business.servesCuisine,
      Array.isArray(business.servesCuisine)
        ? JSON.stringify(business.servesCuisine)
        : clean(business.servesCuisine),
    );
    if (typeof business.address === 'object' && business.address) {
      fact('address', business.address.streetAddress);
      fact('city', business.address.addressLocality);
    }
    const geo = business.geo;
    if (
      geo &&
      ['number', 'string'].includes(typeof geo.latitude) &&
      ['number', 'string'].includes(typeof geo.longitude) &&
      String(geo.latitude).trim() &&
      String(geo.longitude).trim()
    ) {
      const lat = Number(geo.latitude);
      const lng = Number(geo.longitude);
      if (
        Number.isFinite(lat) &&
        Math.abs(lat) <= 90 &&
        Number.isFinite(lng) &&
        Math.abs(lng) <= 180
      ) {
        result.location = { type: 'Point', coordinates: [lng, lat] };
        fact('location', `${lat}, ${lng}`, JSON.stringify(geo));
      }
    }
    const url = website(business.url);
    if (url) fact('website', url, clean(business.url));
    const phone = clean(business.telephone);
    if (/^\+?[\d\s().-]{6,30}$/.test(phone)) fact('phone', phone);
    const email = clean(business.email).replace(/^mailto:/i, '');
    if (leadDetailsSchema.shape.email.safeParse(email).success)
      fact('email', email, clean(business.email));
    const owner = business.owner ?? business.founder;
    if (
      owner &&
      !Array.isArray(owner) &&
      typeof owner === 'object' &&
      owner['@type'] === 'Person'
    ) {
      fact('contactName', owner.name);
      fact(
        'contactRole',
        business.owner ? 'Owner' : 'Founder',
        business.owner ? '"owner"' : '"founder"',
      );
    }
  }

  const labelled = (label: string) =>
    text.match(
      new RegExp(`(?:^|\\n)${label}\\s*[:–-]\\s*([^\\n]{2,160})`, 'i'),
    );
  if (names.size <= 1) {
    for (const [field, label] of [
      [
        'businessName',
        '(?:handelsnaam|naam inrichting|naam restaurant|naam horecabedrijf)',
      ],
      [
        'address',
        '(?:vestigingsadres|adres inrichting|adres restaurant|locatie inrichting)',
      ],
      ['city', '(?:vestigingsplaats|plaats inrichting|plaats restaurant)'],
      ['concept', '(?:keuken|restaurantconcept|soort restaurant)'],
    ] as const) {
      const match = labelled(label);
      if (match && !extracted.has(field))
        fact(field, match[1], match[0].trim());
    }
    for (const [field, label] of [
      ['website', '(?:website restaurant|website inrichting)'],
      [
        'phone',
        '(?:telefoon restaurant|telefoon inrichting|zakelijk telefoonnummer)',
      ],
      [
        'email',
        '(?:e-mail restaurant|e-mailadres restaurant|e-mail inrichting)',
      ],
    ] as const) {
      const match = labelled(label);
      if (!match || extracted.has(field)) continue;
      const value = clean(match[1]);
      if (field === 'website') {
        const url = website(value);
        if (url) fact(field, url, match[0].trim());
      } else if (
        field === 'email'
          ? leadDetailsSchema.shape.email.safeParse(value).success
          : /^\+?[\d\s().-]{6,30}$/.test(value)
      ) {
        fact(field, value, match[0].trim());
      }
    }
    if (!extracted.has('businessName')) {
      const named = headline.match(
        /\b(?:[Rr]estaurant|[Bb]rasserie|[Bb]istro|[Ll]unchroom|[Ee]etcaf[eé]|[Cc]afé)\s+[“"]?([\p{Lu}][\p{L}\p{N}&'’ -]{1,70}?)[”"]?\s+(?:opent|gaat open|wordt geopend|aan de|aan het)\b/u,
      );
      if (named) fact('businessName', named[1], named[0]);
    }
    const location = [headline, ...paragraphs]
      .find(
        (paragraph) =>
          /restaurant|brasserie|horeca|exploitatievergunning|alcoholwet/i.test(
            paragraph,
          ) &&
          /\b(?:aan|op) (?:de |het )?[\p{Lu}][\p{L} .'-]+ \d{1,4}[A-Za-z]? (?:in|te) /u.test(
            paragraph,
          ),
      )
      ?.match(
        /\b(?:aan|op) (?:de |het )?([\p{Lu}][\p{L} .'-]{1,65} \d{1,4}[A-Za-z]?) (?:in|te) ([\p{Lu}][\p{L}'’-]+(?: [\p{Lu}][\p{L}'’-]+){0,2})(?=[,.;:!?]|$)/u,
      );
    if (location) {
      if (!extracted.has('address')) fact('address', location[1], location[0]);
      if (!extracted.has('city')) fact('city', location[2], location[0]);
    }
    if (!extracted.has('city')) {
      const city = headline.match(
        /\b(?:in|te) ([\p{Lu}][\p{L}'’-]+(?: [\p{Lu}][\p{L}'’-]+){0,2})[.!?]?$/u,
      );
      if (city && OPENING.test(headline)) fact('city', city[1], headline);
    }
    // Keep the source's actual timing sentence: no invented date or precision.
    const opening = [headline, ...paragraphs]
      .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
      .find(
        (sentence) =>
          OPENING.test(sentence) &&
          TIMING.test(sentence) &&
          sentence.length <= 600 &&
          !(sentence.match(/\b20\d{2}\b/g) ?? []).some(
            (year) => Number(year) < new Date().getFullYear(),
          ),
      );
    if (opening) fact('openingWindow', opening, opening);
  }

  // This is a source excerpt, not an AI-generated sales claim.
  const summary = paragraphs.find(
    (paragraph) => paragraph.length >= 40 && paragraph.length <= 600,
  );
  if (summary) fact('summary', summary);
  if (
    !fullPage &&
    lead.address &&
    !details.evidence.some((item) => item.field === 'address')
  ) {
    details.evidence.push({
      field: 'address',
      quote: lead.address,
      url: sourceUrl,
    });
  }
  if (!fullPage && !details.note)
    details.note =
      'Fetched feed/notice content only. Open the original page to verify missing details.';
  return result;
}
