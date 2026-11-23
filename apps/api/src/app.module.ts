import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { DatabaseModule } from './database/database.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [DatabaseModule, LeadsModule],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
