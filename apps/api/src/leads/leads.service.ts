import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { Db, Document } from '@repo/db';
import { addJob, addJobs, JOBS, type Queue } from '@repo/queue';
import { MONGODB_DATABASE } from '../database/database.module';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

const NEWS_FEEDS = [
  'https://news.google.com/rss/search?q=%22nieuw+restaurant%22+opent&hl=nl&gl=NL&ceid=NL:nl',
  'https://www.omroepbrabant.nl/rss',
];
const DAILY_AT_SIX = { pattern: '0 6 * * *', tz: 'Europe/Amsterdam' };

@Injectable()
export class LeadsService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    @Inject(MONGODB_DATABASE) private readonly db: Db,
    @Inject(JOB_QUEUE) private readonly queue: Queue,
  ) {}

  list(): Promise<Document[]> {
    return this.db
      .collection('leads')
      .find()
      .sort({ publishedAt: -1 })
      .limit(200)
      .toArray();
  }

  async scanNow() {
    await addJob(this.queue, JOBS.officialNotices, { lookbackDays: 30 });
    await addJobs(
      this.queue,
      JOBS.newsFeed,
      NEWS_FEEDS.map((url) => ({ url })),
    );
    return { queued: 1 + NEWS_FEEDS.length };
  }

  // Stored in Redis: safe on every start, fires once a day however many workers run.
  async onApplicationBootstrap() {
    await this.queue.upsertJobScheduler(
      'daily-official-notices',
      DAILY_AT_SIX,
      {
        name: JOBS.officialNotices,
        data: { lookbackDays: 2 },
      },
    );
    await Promise.all(
      NEWS_FEEDS.map((url, index) =>
        this.queue.upsertJobScheduler(
          `daily-news-feed-${index}`,
          DAILY_AT_SIX,
          {
            name: JOBS.newsFeed,
            data: { url },
          },
        ),
      ),
    );
  }

  onApplicationShutdown() {
    return this.queue.close();
  }
}
