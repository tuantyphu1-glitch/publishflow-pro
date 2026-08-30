import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createJob } from '@/lib/workflow/jobs';
import { scriptAnalysisQueue, DEFAULT_JOB_OPTS } from '@/lib/queue/queues';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const job = await createJob({ projectId: id, type: 'SCRIPT_ANALYSIS' });
  await db.project.update({ where: { id }, data: { status: 'ANALYZING' } });

  await scriptAnalysisQueue().add('analyze', { generationJobId: job.id, projectId: id }, { ...DEFAULT_JOB_OPTS, jobId: job.id });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
