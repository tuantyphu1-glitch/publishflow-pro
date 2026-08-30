import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardTitle } from '@/components/shared/Card';
import { StatusBadge } from '@/components/shared/Badge';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { scenes: { orderBy: { index: 'asc' } } },
  });
  if (!project) notFound();

  const workflow = await db.workflow.findUnique({ where: { id: project.workflowId } });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        {workflow?.name ?? project.workflowId} · {aspectRatioFromEnum(project.aspectRatio)} · {project.language} · target{' '}
        {project.targetDuration}s
      </p>

      <Card className="mb-5">
        <CardTitle>Script</CardTitle>
        <pre className="whitespace-pre-wrap text-sm text-neutral-300 font-sans">{project.script}</pre>
      </Card>

      <Card>
        <CardTitle>Storyboard ({project.scenes.length} scenes)</CardTitle>
        {project.scenes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No scenes yet. Script analysis (Phase 2) will split this script into scenes here.
          </p>
        ) : (
          <div className="space-y-2">
            {project.scenes.map((scene) => (
              <div key={scene.id} className="border border-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Scene {scene.index + 1} · {scene.duration}s</div>
                <div className="text-sm text-neutral-200">{scene.voiceover}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
