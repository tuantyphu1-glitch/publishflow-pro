import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TYPE_ICON: Record<string, string> = { IMAGE: '🖼️', VIDEO: '🎞️', AUDIO: '🔊', SUBTITLE: '💬', FINAL_VIDEO: '🎬' };

export default async function AssetsPage() {
  const assets = await db.asset.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">Assets</h1>
      <p className="text-sm text-neutral-400 mb-6">Every generated image, video clip, and audio file, with its provider and model.</p>
      {assets.length === 0 ? (
        <div className="text-sm text-neutral-400 border border-dashed border-neutral-800 rounded-xl p-10 text-center">
          No assets generated yet.
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800">
          {assets.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span>{TYPE_ICON[a.type] ?? '📄'}</span>
                <div>
                  <div className="text-sm text-neutral-200">{a.type}</div>
                  <div className="text-xs text-neutral-500">
                    {a.provider ?? 'unknown'} {a.model ? `· ${a.model}` : ''}
                  </div>
                </div>
              </div>
              {a.provider === 'mock' && (
                <span className="text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
                  Mock
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
