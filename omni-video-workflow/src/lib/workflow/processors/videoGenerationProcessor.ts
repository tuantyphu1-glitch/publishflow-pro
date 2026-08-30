import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { getVideoProvider, getVideoFallbackProvider, withFallback } from '@/lib/workflow/registry';
import { composeVideoMotionPrompt } from '@/lib/workflow/promptComposer';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';
import { markJobProgress } from '@/lib/workflow/jobs';
import { WORKFLOW_REGISTRY } from '../../../../workflows';
import type { WorkflowConfig } from '@/types/workflow';
import type { VideoGenerationJobData } from '@/lib/queue/queues';

export async function runVideoGeneration(data: VideoGenerationJobData): Promise<{ assetId: string; url: string }> {
  const scene = await db.scene.findUnique({ where: { id: data.sceneId }, include: { imageAsset: true } });
  if (!scene) throw new Error(`Scene not found: ${data.sceneId}`);
  if (!scene.imageAsset) {
    throw new Error('Scene has no approved image yet -- generate the image before requesting a video clip.');
  }
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error(`Project not found: ${data.projectId}`);

  const dbWorkflow = await db.workflow.findUnique({ where: { id: project.workflowId } });
  const workflow: WorkflowConfig = dbWorkflow ? (dbWorkflow.configJson as unknown as WorkflowConfig) : WORKFLOW_REGISTRY[project.workflowId];

  const storage = getStorageProvider();
  const sourceImageBuffer = await storage.download(scene.imageAsset.storageKey);
  const motionPrompt = composeVideoMotionPrompt({ videoPrompt: scene.videoPrompt, camera: scene.camera, movement: scene.movement, workflow });

  const primary = await getVideoProvider();
  const fallback = await getVideoFallbackProvider();
  const result = await withFallback(
    {
      sourceImageBuffer,
      motionPrompt,
      cameraInstructions: scene.camera ?? undefined,
      durationSeconds: scene.duration,
      aspectRatio: aspectRatioFromEnum(project.aspectRatio),
      resolution: '720p' as const,
    },
    { id: primary.id, run: (r) => primary.generateVideo(r, (pct) => void markJobProgress(data.generationJobId, pct)) },
    fallback ? { id: fallback.id, run: (r) => fallback.generateVideo(r) } : null,
    { operation: 'generateVideo', projectId: project.id },
  );

  const storageKey = `projects/${project.id}/scenes/${scene.id}/video.mp4`;
  const { url } = await storage.upload({ key: storageKey, data: result.videoBuffer, contentType: result.contentType });

  const asset = await db.asset.create({
    data: {
      type: 'VIDEO',
      storageKey,
      url,
      provider: result.provider,
      model: result.model,
      durationSeconds: result.durationSeconds,
      metadata: { motionPrompt } as object,
    },
  });

  await db.scene.update({ where: { id: scene.id }, data: { videoAssetId: asset.id, status: 'VIDEO_READY' } });

  return { assetId: asset.id, url };
}
