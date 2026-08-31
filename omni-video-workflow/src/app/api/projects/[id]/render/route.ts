import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { renderQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const scenes = await db.scene.findMany({ where: { projectId: id }, select: { index: true, videoAssetId: true } });
  if (scenes.length === 0) {
    return NextResponse.json({ error: 'Cannot render: project has no scenes yet.' }, { status: 400 });
  }
  const missing = scenes.filter((s) => !s.videoAssetId).map((s) => s.index + 1);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Cannot render: scene(s) ${missing.join(', ')} have no video clip yet. Generate their videos first.` },
      { status: 400 },
    );
  }

  const render = await db.render.create({ data: { projectId: id, status: 'QUEUED' } });
  const job = await createJob({ projectId: id, type: 'RENDER' });
  await db.project.update({ where: { id }, data: { status: 'RENDERING' } });

  await renderQueue().add(
    'render',
    { generationJobId: job.id, projectId: id, renderId: render.id },
    { ...DEFAULT_JOB_OPTS, jobId: job.id, attempts: 1 }, // a partial/broken render should never silently retry over stale temp state
  );

  return NextResponse.json({ jobId: job.id, renderId: render.id }, { status: 202 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const renders = await db.render.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(renders);
}
