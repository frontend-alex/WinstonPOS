import { Inject, Injectable } from '@nestjs/common';
import type { Lead } from '@repo/contracts';
import type { Db } from '@repo/db';
import { leadsCollection } from '@repo/db/leads';
import { MONGODB_DATABASE } from '../database/database.module';
import { toApiLead } from './utils/map-lead';

@Injectable()
export class LeadsService {
  constructor(@Inject(MONGODB_DATABASE) private readonly db: Db) {}

  async list(): Promise<Lead[]> {
    const leads = await leadsCollection(this.db)
      .find()
      .sort({ publishedAt: -1 })
      .toArray();
    return leads.map(toApiLead);
  }
}
