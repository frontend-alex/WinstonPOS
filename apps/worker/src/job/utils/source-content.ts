import { Logger } from '@nestjs/common';
import robotsParser from 'robots-parser';

type RobotsPolicy = ReturnType<typeof robotsParser>;
export interface SourceFetchState {
  policies: Map<string, RobotsPolicy | null>;
  pages: number;
}

const SOURCE_HOSTS = new Set([
  'zoek.officielebekendmakingen.nl',
  'repository.overheid.nl',
  'www.omroepbrabant.nl',
  'omroepbrabant.nl',
]);

const USER_AGENT = 'OpeningRadar/0.1';
const MAX_PAGES = 20;
const MAX_BYTES = 1_000_000;

function allowed(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.port &&
    SOURCE_HOSTS.has(url.hostname)
  );
}

// One state per job: bounded requests and cached robots policies. A blocked or
// unavailable publisher is not repeatedly retried during the same job.
export async function readSourcePage(rawUrl: string, state: SourceFetchState) {
  let origin: string | undefined;
  try {
    const url = new URL(rawUrl);
    origin = url.origin;
    if (!allowed(url) || state.pages >= MAX_PAGES) return undefined;
    state.pages++;
    if (!state.policies.has(origin)) {
      state.policies.set(origin, null);
      const response = await fetchSourceResponse(new URL('/robots.txt', url));
      state.policies.set(
        origin,
        response.status === 404
          ? robotsParser(`${origin}/robots.txt`, '')
          : response.ok
            ? robotsParser(`${origin}/robots.txt`, response.body)
            : null,
      );
    }
    const policy = state.policies.get(origin);
    const delay = Math.max(
      2_000,
      (policy?.getCrawlDelay(USER_AGENT) ?? 0) * 1_000,
    );
    if (
      policy?.isAllowed(url.href, USER_AGENT) !== true ||
      !Number.isFinite(delay) ||
      delay > 30_000
    )
      return undefined;
    await new Promise((resolve) => setTimeout(resolve, delay));
    const response = await fetchSourceResponse(url, policy);
    if ([401, 403, 429].includes(response.status) || response.status >= 500) {
      state.policies.set(origin, null);
    }
    if (
      !response.ok ||
      !/(?:text\/html|application\/xhtml\+xml)/i.test(response.contentType) ||
      /nosnippet|noarchive/i.test(response.robots)
    )
      return undefined;
    return response;
  } catch {
    if (origin) state.policies.set(origin, null);
    Logger.warn(
      'Source-page enrichment unavailable; retaining source metadata.',
      'SourceEnrichment',
    );
    return undefined;
  }
}

async function fetchSourceResponse(url: URL, policy?: RobotsPolicy) {
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!allowed(url)) throw new Error('Source URL is not allowed');
    if (policy && policy.isAllowed(url.href, USER_AGENT) !== true) {
      throw new Error('Source path is disallowed by robots policy');
    }
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) throw new Error('Source redirect has no location');
      const next = new URL(location, url);
      if (next.origin !== url.origin)
        throw new Error('Cross-origin source redirect');
      url = next;
      continue;
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error('Source response is too large');
    }
    let body = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    if (response.body) {
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > MAX_BYTES) throw new Error('Source response is too large');
        body += decoder.decode(chunk, { stream: true });
      }
      body += decoder.decode();
    }
    return {
      ok: response.ok,
      status: response.status,
      body,
      url: url.href,
      contentType: response.headers.get('content-type') ?? '',
      robots: response.headers.get('x-robots-tag') ?? '',
    };
  }
  throw new Error('Too many source redirects');
}
