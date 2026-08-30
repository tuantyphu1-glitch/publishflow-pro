import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { imageGenerationQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

/** Fan-out: one IMAGE_GENERATION job per scene that doesn't have an image asset yet. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const scenes = await db.scene.findMany({ where: { projectId: id, imageAssetId: null }, orderBy: { index: 'asc' } });
  if (scenes.length === 0) {
    return NextResponse.json({ jobIds: [], message: 'No scenes pending image generation' }, { status: 200 });
  }

  await db.project.update({ where: { id }, data: { status: 'GENERATING' } });

  const jobIds: string[] = [];
  for (const scene of scenes) {
    const job = await createJob({ projectId: id, sceneId: scene.id, type: 'IMAGE_GENERATION' });
    await db.scene.update({ where: { id: scene.id }, data: { status: 'IMAGE_QUEUED' } });
    await imageGenerationQueue().add(
      'generate-image',
      { generationJobId: job.id, projectId: id, sceneId: scene.id },
      { ...DEFAULT_JOB_OPTS, jobId: job.id },
    );
    jobIds.push(job.id);
  }

  return NextResponse.json({ jobIds }, { status: 202 });
}
