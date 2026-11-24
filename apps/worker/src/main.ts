import { Logger } from '@nestjs/common';
import { config } from '@repo/env/config';
import { createApp } from './create-app';

async function boostrap() {
  const app = await createApp();

  app.enableShutdownHooks();

  new Logger('Bootstrap').log({
    message: 'Worker application started',
    environment: config.NODE_ENV,
  });
}

void boostrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(
    { message: 'Worker failed to start' },
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
