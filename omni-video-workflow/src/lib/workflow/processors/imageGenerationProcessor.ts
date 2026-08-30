import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { getImageProvider, getImageFallbackProvider, withFallback } from '@/lib/workflow/registry';
import { composeImagePrompt, collectReferenceImages } from '@/lib/workflow/promptComposer';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';
import { WORKFLOW_REGISTRY } from '../../../../workflows';
import type { WorkflowConfig } from '@/types/workflow';
import type { ImageGenerationJobData } from '@/lib/queue/queues';

export async function runImageGeneration(data: ImageGenerationJobData): Promise<{ assetId: string; url: string }> {
  const scene = await db.scene.findUnique({ where: { id: data.sceneId } });
  if (!scene) throw new Error(`Scene not found: ${data.sceneId}`);
  const project = await db.project.findUnique({
    where: { id: data.projectId },
    include: {
      characters: { include: { character: { include: { referenceImages: true } } } },
      products: { include: { product: { include: { referenceImages: true } } } },
    },
  });
  if (!project) throw new Error(`Project not found: ${data.projectId}`);

  const dbWorkflow = await db.workflow.findUnique({ where: { id: project.workflowId } });
  const workflow: WorkflowConfig = dbWorkflow ? (dbWorkflow.configJson as unknown as WorkflowConfig) : WORKFLOW_REGISTRY[project.workflowId];

  const referenceImages = await collectReferenceImages({
    characters: project.characters.map((pc) => pc.character),
    products: project.products.map((pp) => pp.product),
  });
  const { prompt, negativePrompt } = composeImagePrompt({
    scenePrompt: scene.imagePrompt,
    workflow,
    hasReferences: referenceImages.length > 0,
  });

  const primary = await getImageProvider();
  const fallback = await getImageFallbackProvider();
  const result = await withFallback(
    {
      prompt,
      negativePrompt,
      referenceImages,
      aspectRatio: aspectRatioFromEnum(project.aspectRatio),
    },
    { id: primary.id, run: (r) => primary.generateImage(r) },
    fallback ? { id: fallback.id, run: (r) => fallback.generateImage(r) } : null,
    { operation: 'generateImage', projectId: project.id },
  );

  const storage = getStorageProvider();
  const storageKey = `projects/${project.id}/scenes/${scene.id}/image.png`;
  const { url } = await storage.upload({ key: storageKey, data: result.imageBuffer, contentType: result.contentType });

  const asset = await db.asset.create({
    data: {
      type: 'IMAGE',
      storageKey,
      url,
      provider: result.provider,
      model: result.model,
      metadata: { prompt, negativePrompt } as object,
    },
  });

  await db.scene.update({ where: { id: scene.id }, data: { imageAssetId: asset.id, status: 'IMAGE_READY' } });

  return { assetId: asset.id, url };
}
