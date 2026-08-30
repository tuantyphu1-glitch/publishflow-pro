import { db } from '@/lib/db';
import { Card } from '@/components/shared/Card';
import type { WorkflowConfig } from '@/types/workflow';

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  const workflows = await db.workflow.findMany({ orderBy: { id: 'asc' } });
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">Workflows</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Each profile overrides system prompt, scene rules, image/video/voice style, and subtitle style — with zero
        engine changes.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {workflows.map((w) => {
          const config = w.configJson as unknown as WorkflowConfig;
          return (
            <Card key={w.id}>
              <div className="text-sm font-semibold mb-1">{w.name}</div>
              <div className="text-xs text-neutral-500 mb-3">{config.description}</div>
              <div className="text-xs text-neutral-400 space-y-1">
                <div>Scenes: {config.sceneRules.minScenes}–{config.sceneRules.maxScenes}</div>
                <div>Default scene duration: {config.sceneRules.defaultSceneDuration}s</div>
                <div>Recommended total: {config.recommendedDuration}s</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
