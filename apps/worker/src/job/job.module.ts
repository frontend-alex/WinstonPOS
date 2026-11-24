import { BullModule } from '@nestjs/bullmq';
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { closeDatabase, connectDatabase } from '@repo/db';
import { config } from '@repo/env/config';
import {
  createRedisConnection,
  JOB_QUEUE_NAME,
  JOB_QUEUE_OPTIONS,
} from '@repo/queue';
import { JobWorker } from './job.worker';
import { LeadsService, MONGODB_DATABASE } from './leads.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: createRedisConnection(config.REDIS_URL),
      defaultJobOptions: JOB_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({ name: JOB_QUEUE_NAME }),
  ],
  providers: [
    JobWorker,
    LeadsService,
    { provide: MONGODB_DATABASE, useFactory: () => connectDatabase() },
  ],
})
export class JobModule implements OnApplicationShutdown {
  onApplicationShutdown() {
    return closeDatabase();
  }
}
