import { promises as fs } from 'fs';
import path from 'path';
import type { StorageProvider, StorageUploadParams } from './types';
import { assertSafeStorageKey } from './keyValidation';

export class LocalStorageProvider implements StorageProvider {
  constructor(private root: string) {}

  private resolvePath(key: string): string {
    assertSafeStorageKey(key);
    const resolved = path.resolve(this.root, key);
    const rootResolved = path.resolve(this.root);
    if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
      // Defense in depth: assertSafeStorageKey should already prevent this.
      throw new Error('Invalid storage key: resolved outside storage root');
    }
    return resolved;
  }

  async upload({ key, data }: StorageUploadParams): Promise<{ key: string; url: string }> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return { key, url: await this.getUrl(key) };
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolvePath(key), { force: true });
  }

  async getUrl(key: string): Promise<string> {
    assertSafeStorageKey(key);
    return `/api/storage/${key}`;
  }
}
