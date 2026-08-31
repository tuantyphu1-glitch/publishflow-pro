import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { ttsGenerationQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

/** Regenerates a single scene's voiceover without touching any other scene (Rule 8/9). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const scene = await db.scene.findFirst({ where: { id: sceneId, projectId: id } });
  if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

  const job = await createJob({ projectId: id, sceneId, type: 'TTS' });
  await ttsGenerationQueue().add(
    'generate-voice',
    { generationJobId: job.id, projectId: id, sceneId },
    { ...DEFAULT_JOB_OPTS, jobId: job.id },
  );

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
