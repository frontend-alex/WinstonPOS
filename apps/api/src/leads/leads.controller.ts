import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { ApiResponse, Lead, ScanQueued } from '@repo/contracts';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { LeadsService } from './leads.service';
// biome-ignore lint/style/useImportType: Nest needs the class at runtime to inject it.
import { ScansService } from './scans.service';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly scans: ScansService,
  ) {}

  @Get()
  async list(): Promise<ApiResponse<Lead[]>> {
    return { data: await this.leads.list(), message: 'Leads retrieved' };
  }

  @Post('scan')
  @HttpCode(202)
  async scan(): Promise<ApiResponse<ScanQueued>> {
    return { data: await this.scans.scanNow(), message: 'Scan queued' };
  }
}
