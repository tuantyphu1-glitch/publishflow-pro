import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CreateProjectRequestSchema, aspectRatioToEnum } from '@/lib/validation/schemas';
import { serializeProject, defaultResolutionFor } from '@/lib/api/serialize';

export async function GET() {
  const projects = await db.project.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(projects.map(serializeProject));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  const workflow = await db.workflow.findUnique({ where: { id: input.workflowId } });
  if (!workflow) {
    return NextResponse.json({ error: `Unknown workflowId: ${input.workflowId}` }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      name: input.name,
      workflowId: input.workflowId,
      language: input.language,
      aspectRatio: aspectRatioToEnum(input.aspectRatio),
      resolution: defaultResolutionFor(input.aspectRatio),
      targetDuration: input.targetDuration,
      script: input.script,
    },
  });

  logger.info('project_created', { projectId: project.id, workflowId: input.workflowId });
  return NextResponse.json(serializeProject(project), { status: 201 });
}
