import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProject } from '@/lib/api/serialize';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { index: 'asc' }, include: { imageAsset: true, videoAsset: true, audioAsset: true } },
      characters: { include: { character: { include: { referenceImages: true } } } },
      products: { include: { product: { include: { referenceImages: true } } } },
      renders: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json({
    ...serializeProject(project),
    scenes: project.scenes,
    characters: project.characters.map((pc) => pc.character),
    products: project.products.map((pp) => pp.product),
    latestRender: project.renders[0] ?? null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  await db.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
