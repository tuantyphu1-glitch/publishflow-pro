import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';
import { ProjectWorkspace } from '@/components/storyboard/ProjectWorkspace';
import type { ProjectDTO } from '@/components/storyboard/types';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { index: 'asc' }, include: { imageAsset: true, videoAsset: true, audioAsset: true } },
      renders: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!project) notFound();

  const dto: ProjectDTO = {
    id: project.id,
    name: project.name,
    workflowId: project.workflowId,
    language: project.language,
    aspectRatio: aspectRatioFromEnum(project.aspectRatio),
    targetDuration: project.targetDuration,
    script: project.script,
    status: project.status,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      index: s.index,
      duration: s.duration,
      voiceover: s.voiceover,
      visualDescription: s.visualDescription,
      imagePrompt: s.imagePrompt,
      videoPrompt: s.videoPrompt,
      camera: s.camera,
      movement: s.movement,
      status: s.status,
      imageAsset: s.imageAsset
        ? { id: s.imageAsset.id, url: s.imageAsset.url, provider: s.imageAsset.provider, model: s.imageAsset.model, durationSeconds: s.imageAsset.durationSeconds }
        : null,
      videoAsset: s.videoAsset
        ? { id: s.videoAsset.id, url: s.videoAsset.url, provider: s.videoAsset.provider, model: s.videoAsset.model, durationSeconds: s.videoAsset.durationSeconds }
        : null,
      audioAsset: s.audioAsset
        ? { id: s.audioAsset.id, url: s.audioAsset.url, provider: s.audioAsset.provider, model: s.audioAsset.model, durationSeconds: s.audioAsset.durationSeconds }
        : null,
    })),
    latestRender: project.renders[0]
      ? { id: project.renders[0].id, status: project.renders[0].status, outputUrl: project.renders[0].outputUrl, errorText: project.renders[0].errorText }
      : null,
  };

  return <ProjectWorkspace initialProject={dto} />;
}
