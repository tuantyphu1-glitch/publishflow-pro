import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { videoGenerationQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

/** Regenerates a single scene's video clip without touching any other scene (Rule 8/9). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const scene = await db.scene.findFirst({ where: { id: sceneId, projectId: id } });
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  if (!scene.imageAssetId) {
    return NextResponse.json({ error: 'Scene has no approved image yet -- generate the image first' }, { status: 400 });
  }

  const job = await createJob({ projectId: id, sceneId, type: 'VIDEO_GENERATION' });
  await db.scene.update({ where: { id: sceneId }, data: { status: 'VIDEO_QUEUED' } });
  await videoGenerationQueue().add(
    'generate-video',
    { generationJobId: job.id, projectId: id, sceneId },
    { ...DEFAULT_JOB_OPTS, jobId: job.id },
  );

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
