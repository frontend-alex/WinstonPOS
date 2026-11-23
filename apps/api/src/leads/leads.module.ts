import { Module } from "@nestjs/common";
import { config } from "@repo/env/config";
import { createQueue } from "@repo/queue";
import { LeadsController } from "./leads.controller";
import { JOB_QUEUE, LeadsService } from "./leads.service";

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    { provide: JOB_QUEUE, useFactory: () => createQueue(config.REDIS_URL) },
  ],
})
export class LeadsModule {}
