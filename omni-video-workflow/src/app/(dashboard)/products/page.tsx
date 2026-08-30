import { db } from '@/lib/db';
import { Card } from '@/components/shared/Card';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await db.product.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Products</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Product reference images preserved across image generation: shape, color, logo, and proportions.
      </p>
      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">No products yet. Upload a reference image from a project&apos;s scene editor (Phase 3).</p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="text-sm font-medium mb-1">{p.name}</div>
              <div className="text-xs text-neutral-500 line-clamp-3">{p.description}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
