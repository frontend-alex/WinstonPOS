import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export function createApp(): Promise<INestApplicationContext> {
  return NestFactory.createApplicationContext(AppModule);
}
