import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { ScanResult } from '@repo/contracts';
import { JOB_QUEUE_NAME } from '@repo/queue';
import type { Job } from 'bullmq';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { LeadsService } from './leads.service';
import { discoverLeads } from './utils/discover-leads';
import { enrichLeads } from './utils/enrich-leads';

// One job at a time keeps us polite to the government API.
@Processor(JOB_QUEUE_NAME, { concurrency: 1 })
export class JobWorker extends WorkerHost {
  constructor(private readonly leads: LeadsService) {
    super();
  }

  async process(job: Job<unknown>): Promise<ScanResult> {
    const discovered = await discoverLeads(job.name, job.data);
    const enriched = await enrichLeads(discovered);
    return this.leads.save(enriched);
  }
}
