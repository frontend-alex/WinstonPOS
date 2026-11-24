import { Module } from '@nestjs/common';
import { config } from '@repo/env/config';
import { createQueue } from '@repo/queue';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { JOB_QUEUE, ScansService } from './scans.service';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    ScansService,
    { provide: JOB_QUEUE, useFactory: () => createQueue(config.REDIS_URL) },
  ],
})
export class LeadsModule {}
