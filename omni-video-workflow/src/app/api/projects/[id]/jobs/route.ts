import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** Batched polling endpoint: the UI polls this once per project rather than once per job. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobs = await db.generationJob.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json(jobs);
}
