import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ScanResult } from '@repo/contracts';
import type { Db } from '@repo/db';
import {
  type DiscoveredLead,
  discoveredLeadSchema,
  leadsCollection,
} from '@repo/db/leads';
import { buildLeadUpdate } from './utils/lead-update';

export const MONGODB_DATABASE = Symbol('MONGODB_DATABASE');

@Injectable()
export class LeadsService implements OnModuleInit {
  constructor(@Inject(MONGODB_DATABASE) private readonly db: Db) {}

  private get leads() {
    return leadsCollection(this.db);
  }

  onModuleInit() {
    return this.leads.createIndexes([
      { key: { source: 1, externalId: 1 }, unique: true },
    ]);
  }

  async save(leads: DiscoveredLead[]): Promise<ScanResult> {
    // Validate the entire batch before writing anything to MongoDB.
    const validated = discoveredLeadSchema.array().parse(leads);

    const results = await Promise.all(
      validated.map((lead) =>
        this.leads.updateOne(
          { source: lead.source, externalId: lead.externalId },
          buildLeadUpdate(lead),
          { upsert: true, ignoreUndefined: true },
        ),
      ),
    );

    const saved = results.reduce(
      (total, result) => total + result.upsertedCount + result.modifiedCount,
      0,
    );
    return { found: leads.length, saved };
  }
}
