import Link from 'next/link';
import { db } from '@/lib/db';
import { Card } from '@/components/shared/Card';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [projectCount, workflowCount, usageCount, recentProjects] = await Promise.all([
    db.project.count(),
    db.workflow.count(),
    db.usageRecord.count(),
    db.project.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-neutral-400 mb-6">One reusable workflow engine, multiple content workflows, interchangeable AI providers.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">Projects</div>
          <div className="text-2xl font-bold">{projectCount}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">Workflow profiles</div>
          <div className="text-2xl font-bold">{workflowCount}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">Provider calls logged</div>
          <div className="text-2xl font-bold">{usageCount}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-200">Recent projects</h2>
        <Link href="/projects/new" className="text-xs text-violet-400 hover:text-violet-300">
          + New project
        </Link>
      </div>
      {recentProjects.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">
            No projects yet. <Link href="/projects/new" className="text-violet-400">Create your first video project</Link>.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {recentProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 hover:border-neutral-700"
            >
              <div className="text-sm font-medium text-neutral-100">{p.name}</div>
              <div className="text-xs text-neutral-500">{p.workflowId} · {p.status}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
