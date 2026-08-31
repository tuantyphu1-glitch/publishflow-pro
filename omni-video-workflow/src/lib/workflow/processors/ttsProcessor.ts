import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { getTTSProvider, getTTSFallbackProvider, withFallback } from '@/lib/workflow/registry';
import { WORKFLOW_REGISTRY } from '../../../../workflows';
import type { WorkflowConfig } from '@/types/workflow';
import type { TTSGenerationJobData } from '@/lib/queue/queues';

export async function runTTSGeneration(data: TTSGenerationJobData): Promise<{ assetId: string; url: string }> {
  const scene = await db.scene.findUnique({ where: { id: data.sceneId } });
  if (!scene) throw new Error(`Scene not found: ${data.sceneId}`);
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error(`Project not found: ${data.projectId}`);

  const dbWorkflow = await db.workflow.findUnique({ where: { id: project.workflowId } });
  const workflow: WorkflowConfig = dbWorkflow ? (dbWorkflow.configJson as unknown as WorkflowConfig) : WORKFLOW_REGISTRY[project.workflowId];

  const primary = await getTTSProvider();
  const fallback = await getTTSFallbackProvider();
  const result = await withFallback(
    {
      text: scene.voiceover,
      language: project.language,
      voice: workflow.voiceStyle.defaultVoice,
      speed: workflow.voiceStyle.defaultSpeed,
    },
    { id: primary.id, run: (r) => primary.generateSpeech(r) },
    fallback ? { id: fallback.id, run: (r) => fallback.generateSpeech(r) } : null,
    { operation: 'generateSpeech', projectId: project.id },
  );

  const storage = getStorageProvider();
  const ext = result.contentType === 'audio/mpeg' ? 'mp3' : 'wav';
  const storageKey = `projects/${project.id}/scenes/${scene.id}/voice.${ext}`;
  const { url } = await storage.upload({ key: storageKey, data: result.audioBuffer, contentType: result.contentType });

  const asset = await db.asset.create({
    data: {
      type: 'AUDIO',
      storageKey,
      url,
      provider: result.provider,
      durationSeconds: result.durationSeconds,
      metadata: { voice: result.voice } as object,
    },
  });

  await db.scene.update({ where: { id: scene.id }, data: { audioAssetId: asset.id, status: 'VOICE_READY' } });

  return { assetId: asset.id, url };
}
