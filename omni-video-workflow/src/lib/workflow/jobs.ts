import type { JobType } from '@prisma/client';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/** Creates a GenerationJob row in QUEUED state. Callers enqueue the matching BullMQ job right after. */
export async function createJob(params: { projectId: string; sceneId?: string; type: JobType; inputJson?: unknown }) {
  return db.generationJob.create({
    data: {
      projectId: params.projectId,
      sceneId: params.sceneId,
      type: params.type,
      status: 'QUEUED',
      inputJson: params.inputJson as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function markJobProcessing(jobId: string) {
  await db.generationJob.update({ where: { id: jobId }, data: { status: 'PROCESSING', progressPct: 0 } });
}

export async function markJobProgress(jobId: string, progressPct: number) {
  await db.generationJob.update({ where: { id: jobId }, data: { progressPct } });
}

export async function markJobCompleted(jobId: string, outputJson?: unknown) {
  await db.generationJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', progressPct: 100, outputJson: outputJson as Prisma.InputJsonValue | undefined },
  });
}

/**
 * Records a failed attempt. `final` (BullMQ's attemptsMade >= opts.attempts) moves the job
 * to FAILED; otherwise it stays QUEUED for BullMQ's own retry/backoff to pick up, with
 * retryCount bumped so the UI can show "attempt 2/3" style progress.
 */
export async function markJobFailed(jobId: string, error: unknown, final: boolean) {
  const message = error instanceof Error ? error.message : String(error);
  await db.generationJob.update({
    where: { id: jobId },
    data: {
      status: final ? 'FAILED' : 'QUEUED',
      lastError: message,
      retryCount: { increment: 1 },
    },
  });
}
