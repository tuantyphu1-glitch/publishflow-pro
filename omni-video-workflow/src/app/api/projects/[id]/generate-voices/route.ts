import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { ttsGenerationQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

/** Fan-out: one TTS job per scene that doesn't have a voiceover asset yet. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const scenes = await db.scene.findMany({ where: { projectId: id, audioAssetId: null }, orderBy: { index: 'asc' } });
  if (scenes.length === 0) {
    return NextResponse.json({ jobIds: [], message: 'No scenes pending voice generation' }, { status: 200 });
  }

  const jobIds: string[] = [];
  for (const scene of scenes) {
    const job = await createJob({ projectId: id, sceneId: scene.id, type: 'TTS' });
    await ttsGenerationQueue().add(
      'generate-voice',
      { generationJobId: job.id, projectId: id, sceneId: scene.id },
      { ...DEFAULT_JOB_OPTS, jobId: job.id },
    );
    jobIds.push(job.id);
  }

  return NextResponse.json({ jobIds }, { status: 202 });
}
