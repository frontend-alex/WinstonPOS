import { JOBS, type Queue, type ScanJob } from '@repo/queue';

const NEWS_FEEDS = [
  'https://news.google.com/rss/search?q=%22nieuw+restaurant%22+opent&hl=nl&gl=NL&ceid=NL:nl',
  'https://www.omroepbrabant.nl/rss',
];
const DAILY_AT_SIX = { pattern: '0 6 * * *', tz: 'Europe/Amsterdam' };

export function buildScanJobs(lookbackDays: number): ScanJob[] {
  return [
    { name: JOBS.officialNotices, data: { lookbackDays } },
    ...NEWS_FEEDS.map((url) => ({ name: JOBS.newsFeed, data: { url } })),
  ];
}

export async function registerDailyScans(queue: Queue): Promise<void> {
  
  await queue.upsertJobScheduler('daily-official-notices', DAILY_AT_SIX, {
    name: JOBS.officialNotices,
    data: { lookbackDays: 2 },
  });

  await Promise.all(
    NEWS_FEEDS.map((url, index) =>
      queue.upsertJobScheduler(`daily-news-feed-${index}`, DAILY_AT_SIX, {
        name: JOBS.newsFeed,
        data: { url },
      }),
    ),
  );
}
