/**
 * Shared by the local storage provider and the /api/storage route: rejects any key
 * that could escape the storage root (path traversal), is absolute, or contains
 * null bytes. Keys must look like "projects/<id>/scenes/<id>/image.png".
 */
const SAFE_KEY_PATTERN = /^[a-zA-Z0-9._/-]+$/;

export function assertSafeStorageKey(key: string): void {
  if (!key || key.includes('\0')) {
    throw new Error('Invalid storage key');
  }
  if (key.startsWith('/') || key.includes('..')) {
    throw new Error('Invalid storage key: path traversal is not allowed');
  }
  if (!SAFE_KEY_PATTERN.test(key)) {
    throw new Error('Invalid storage key: only alphanumerics, dot, dash, underscore, and slash are allowed');
  }
}
