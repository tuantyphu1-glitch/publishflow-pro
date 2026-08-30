import Link from 'next/link';
import { db } from '@/lib/db';
import { StatusBadge } from '@/components/shared/Badge';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await db.project.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-sm text-neutral-400">All video projects across every workflow.</p>
        </div>
        <Link href="/projects/new" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-sm text-neutral-400 border border-dashed border-neutral-800 rounded-xl p-10 text-center">
          No projects yet.{' '}
          <Link href="/projects/new" className="text-violet-400">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900">
              <div>
                <div className="text-sm font-medium text-neutral-100">{p.name}</div>
                <div className="text-xs text-neutral-500">
                  {p.workflowId} · {p.language} · {p.aspectRatio.replace('R', '').replace('_', ':')} · {p.targetDuration}s
                </div>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
