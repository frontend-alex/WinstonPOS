import {
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { closeDatabase, connectDatabase } from '@repo/db';

export const MONGODB_DATABASE = Symbol('MONGODB_DATABASE');

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await closeDatabase();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MONGODB_DATABASE,
      useFactory: () => connectDatabase(),
    },
    DatabaseLifecycle,
  ],
  exports: [MONGODB_DATABASE],
})
export class DatabaseModule {}
