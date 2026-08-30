import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getStorageProvider } from '@/lib/storage';
import { assertSafeStorageKey } from '@/lib/storage/keyValidation';
import { logger } from '@/lib/logger';

const EXT_CONTENT_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const key = segments.join('/');

  try {
    assertSafeStorageKey(key);
  } catch {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
  }

  try {
    const storage = getStorageProvider();
    const buffer = await storage.download(key);
    const ext = path.extname(key).toLowerCase();
    const contentType = EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err) {
    logger.warn('storage_read_failed', { key, error: String(err) });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
