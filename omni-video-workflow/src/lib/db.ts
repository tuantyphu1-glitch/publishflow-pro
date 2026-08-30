import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Next.js dev mode hot-reloads modules, which would otherwise create a new
 * PrismaClient (and a new connection pool) on every edit. Caching it on
 * `globalThis` in development avoids exhausting Postgres connections.
 */
export const db: PrismaClient = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = db;
}
