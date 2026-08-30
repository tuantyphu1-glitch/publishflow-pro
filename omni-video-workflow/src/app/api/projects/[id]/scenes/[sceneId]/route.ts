import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UpdateSceneRequestSchema } from '@/lib/validation/schemas';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const scene = await db.scene.findFirst({ where: { id: sceneId, projectId: id } });
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSceneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await db.scene.update({ where: { id: sceneId }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const scene = await db.scene.findFirst({ where: { id: sceneId, projectId: id } });
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  await db.scene.delete({ where: { id: sceneId } });
  return NextResponse.json({ ok: true });
}
