import IORedis from 'ioredis';
import { getEnv } from '@/lib/validation/env';

let connection: IORedis | null = null;

/**
 * Shared ioredis connection for every BullMQ Queue/Worker. BullMQ requires
 * maxRetriesPerRequest: null on the connection it's given.
 */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}
