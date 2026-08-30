import type { StorageProvider } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { getEnv } from '@/lib/validation/env';

export type { StorageProvider, StorageUploadParams } from './types';

let cached: StorageProvider | null = null;

/**
 * S3-compatible (MinIO/AWS S3) support is designed for but not yet implemented --
 * see ARCHITECTURE.md. Add an S3StorageProvider implementing the same interface
 * and branch on STORAGE_DRIVER === 's3' here; no other code needs to change.
 */
export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const env = getEnv();
  if (env.STORAGE_DRIVER === 's3') {
    throw new Error('S3 storage driver is not yet implemented. Set STORAGE_DRIVER=local for now.');
  }
  cached = new LocalStorageProvider(env.STORAGE_LOCAL_ROOT);
  return cached;
}
