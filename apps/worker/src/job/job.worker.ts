import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_QUEUE_NAME, type JobData, type JobName } from '@repo/queue';
import type { Job } from 'bullmq';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { LeadsService } from './leads.service';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { SourcesService } from './sources.service';

// One handler per job in JobData; the compiler fails if one is missing.
type Handlers = { [N in JobName]: (data: JobData[N]) => Promise<unknown> };

// One job at a time keeps us polite to the government API.
@Processor(JOB_QUEUE_NAME, { concurrency: 1 })
export class JobWorker extends WorkerHost {
  private readonly handlers: Handlers = {
    'official-notices': async ({ lookbackDays }) =>
      this.leads.save(await this.sources.officialNotices(lookbackDays)),
    'news-feed': async ({ url }) =>
      this.leads.save(await this.sources.newsFeed(url)),
  };

  constructor(
    private readonly sources: SourcesService,
    private readonly leads: LeadsService,
  ) {
    super();
  }

  process(job: Job) {
    if (!Object.hasOwn(this.handlers, job.name)) {
      throw new Error(`Unknown job ${job.name}`);
    }
    const handle = this.handlers[job.name as JobName] as (
      data: unknown,
    ) => Promise<unknown>;
    return handle(job.data);
  }
}
