import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Db } from '@repo/db';

export interface Lead {
  source: 'official-notice' | 'news';
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date;
  city?: string;
  address?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
}

export const MONGODB_DATABASE = Symbol('MONGODB_DATABASE');

@Injectable()
export class LeadsService implements OnModuleInit {
  constructor(@Inject(MONGODB_DATABASE) private readonly db: Db) {}

  private get leads() {
    return this.db.collection('leads');
  }

  onModuleInit() {
    return this.leads.createIndexes([
      { key: { source: 1, externalId: 1 }, unique: true },
    ]);
  }

  async save(leads: Lead[]) {
    const results = await Promise.all(
      leads.map((lead) =>
        this.leads.updateOne(
          { source: lead.source, externalId: lead.externalId },
          {
            $setOnInsert: {
              ...lead,
              review: 'candidate',
              createdAt: new Date(),
            },
          },
          { upsert: true },
        ),
      ),
    );

    const saved = results.reduce(
      (total, result) => total + result.upsertedCount,
      0,
    );
    return { found: leads.length, saved };
  }
}
