import { db } from '@/lib/db';
import { analyzeScript } from '@/lib/workflow/scriptAnalysis';
import { WORKFLOW_REGISTRY } from '../../../../workflows';
import type { WorkflowConfig } from '@/types/workflow';
import type { ScriptAnalysisJobData } from '@/lib/queue/queues';

/**
 * Runs script analysis for a project, then persists the result as real Scene rows
 * (replacing any prior scenes -- re-analysis is idempotent, not additive) and any
 * newly-mentioned Character/Product rows. A failure here throws so the caller's
 * retry/backoff logic can act on it; it must never leave the project half-updated.
 */
export async function runScriptAnalysis(data: ScriptAnalysisJobData): Promise<{ sceneCount: number }> {
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error(`Project not found: ${data.projectId}`);

  const dbWorkflow = await db.workflow.findUnique({ where: { id: project.workflowId } });
  const workflow: WorkflowConfig = dbWorkflow
    ? (dbWorkflow.configJson as unknown as WorkflowConfig)
    : WORKFLOW_REGISTRY[project.workflowId];
  if (!workflow) throw new Error(`Unknown workflow: ${project.workflowId}`);

  const analysis = await analyzeScript({ script: project.script, workflow, projectId: project.id });

  await db.$transaction(async (tx) => {
    await tx.scene.deleteMany({ where: { projectId: project.id } });
    await tx.scene.createMany({
      data: analysis.scenes.map((scene, index) => ({
        projectId: project.id,
        index,
        duration: scene.duration,
        voiceover: scene.voiceover,
        visualDescription: scene.visualDescription,
        imagePrompt: scene.imagePrompt,
        videoPrompt: scene.videoPrompt,
        camera: scene.camera,
        movement: scene.movement,
        lighting: scene.lighting,
        transition: scene.transition,
        status: 'PENDING' as const,
      })),
    });

    for (const c of analysis.characters) {
      const character =
        (await tx.character.findFirst({ where: { name: c.name } })) ??
        (await tx.character.create({ data: { name: c.name, description: c.description } }));
      await tx.projectCharacter.upsert({
        where: { projectId_characterId: { projectId: project.id, characterId: character.id } },
        update: {},
        create: { projectId: project.id, characterId: character.id },
      });
    }
    for (const p of analysis.products) {
      const product =
        (await tx.product.findFirst({ where: { name: p.name } })) ??
        (await tx.product.create({ data: { name: p.name, description: p.description } }));
      await tx.projectProduct.upsert({
        where: { projectId_productId: { projectId: project.id, productId: product.id } },
        update: {},
        create: { projectId: project.id, productId: product.id },
      });
    }

    await tx.project.update({
      where: { id: project.id },
      data: { status: 'STORYBOARD', analysisJson: analysis as object },
    });
  });

  return { sceneCount: analysis.scenes.length };
}
