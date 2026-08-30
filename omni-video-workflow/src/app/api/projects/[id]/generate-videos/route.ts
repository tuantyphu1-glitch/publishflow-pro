import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { videoGenerationQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

/** Fan-out: one VIDEO_GENERATION job per scene that has an approved image but no video yet. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const scenes = await db.scene.findMany({
    where: { projectId: id, videoAssetId: null, imageAssetId: { not: null } },
    orderBy: { index: 'asc' },
  });
  if (scenes.length === 0) {
    return NextResponse.json({ jobIds: [], message: 'No scenes with an image ready for video generation' }, { status: 200 });
  }

  await db.project.update({ where: { id }, data: { status: 'GENERATING' } });

  const jobIds: string[] = [];
  for (const scene of scenes) {
    const job = await createJob({ projectId: id, sceneId: scene.id, type: 'VIDEO_GENERATION' });
    await db.scene.update({ where: { id: scene.id }, data: { status: 'VIDEO_QUEUED' } });
    await videoGenerationQueue().add(
      'generate-video',
      { generationJobId: job.id, projectId: id, sceneId: scene.id },
      { ...DEFAULT_JOB_OPTS, jobId: job.id },
    );
    jobIds.push(job.id);
  }

  return NextResponse.json({ jobIds }, { status: 202 });
}
