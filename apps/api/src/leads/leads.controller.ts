import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { Document } from '@repo/db';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(): Promise<Document[]> {
    return this.leads.list();
  }

  @Post('scan')
  @HttpCode(202)
  scan() {
    return this.leads.scanNow();
  }
}
