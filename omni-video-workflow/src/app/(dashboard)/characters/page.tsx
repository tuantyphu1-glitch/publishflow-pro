import { db } from '@/lib/db';
import { Card } from '@/components/shared/Card';

export const dynamic = 'force-dynamic';

export default async function CharactersPage() {
  const characters = await db.character.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Characters</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Reference images + structured descriptions used to maximize character consistency across scenes.
      </p>
      {characters.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">No characters yet. Upload a reference image from a project&apos;s scene editor (Phase 3).</p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {characters.map((c) => (
            <Card key={c.id}>
              <div className="text-sm font-medium mb-1">{c.name}</div>
              <div className="text-xs text-neutral-500 line-clamp-3">{c.description}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
