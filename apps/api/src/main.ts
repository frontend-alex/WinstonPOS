import { Logger } from '@nestjs/common';
import { config } from '@repo/env/config';
import { createApp } from './create-app';

async function boostrap() {
  const app = await createApp();

  app.enableShutdownHooks();

  const port = config.API_PORT;
  await app.listen(port, '127.0.0.1');

  new Logger('Bootstrap').log({
    message: 'API application started',
    port,
    environment: config.NODE_ENV,
  });
}

void boostrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(
    { message: 'API failed to start' },
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
