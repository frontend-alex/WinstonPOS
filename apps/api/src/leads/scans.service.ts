import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { ScanQueued } from '@repo/contracts';
import type { Queue } from '@repo/queue';
import { buildScanJobs, registerDailyScans } from './utils/scan-jobs';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

@Injectable()
export class ScansService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(@Inject(JOB_QUEUE) private readonly queue: Queue) {}

  async scanNow(): Promise<ScanQueued> {
    const jobs = buildScanJobs(30);
    await this.queue.addBulk(jobs);
    
    return { queued: jobs.length };
  }

  onApplicationBootstrap() {
    return registerDailyScans(this.queue);
  }

  onApplicationShutdown() {
    return this.queue.close();
  }
}
