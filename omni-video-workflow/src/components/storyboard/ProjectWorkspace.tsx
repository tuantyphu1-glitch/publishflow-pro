'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Card, CardTitle } from '@/components/shared/Card';
import { StatusBadge } from '@/components/shared/Badge';
import { SceneCard } from './SceneCard';
import type { ProjectDTO, GenerationJobDTO } from './types';

export function ProjectWorkspace({ initialProject }: { initialProject: ProjectDTO }) {
  const qc = useQueryClient();
  const projectId = initialProject.id;

  const isActive = () => {
    const list = qc.getQueryData<GenerationJobDTO[]>(['project-jobs', projectId]);
    return list?.some((j) => j.status === 'QUEUED' || j.status === 'PROCESSING') ?? true;
  };

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<ProjectDTO>(`/api/projects/${projectId}`),
    initialData: initialProject,
    refetchInterval: () => (isActive() ? 2000 : false),
  });

  const { data: jobs } = useQuery({
    queryKey: ['project-jobs', projectId],
    queryFn: () => apiFetch<GenerationJobDTO[]>(`/api/projects/${projectId}/jobs`),
    refetchInterval: (query) => {
      const list = query.state.data as GenerationJobDTO[] | undefined;
      if (list === undefined) return 2000; // first load: poll once more to learn real state
      return list.some((j) => j.status === 'QUEUED' || j.status === 'PROCESSING') ? 2000 : false;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['project-jobs', projectId] });
  };

  const analyze = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}/analyze`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const generateImages = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}/generate-images`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const generateVideos = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}/generate-videos`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const regenerateImage = useMutation({
    mutationFn: (sceneId: string) => apiFetch(`/api/projects/${projectId}/scenes/${sceneId}/image`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const regenerateVideo = useMutation({
    mutationFn: (sceneId: string) => apiFetch(`/api/projects/${projectId}/scenes/${sceneId}/video`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  const latestJobBySceneAndType = useMemo(() => {
    const map = new Map<string, GenerationJobDTO>();
    for (const job of jobs ?? []) {
      if (!job.sceneId) continue;
      const key = `${job.sceneId}:${job.type}`;
      const existing = map.get(key);
      if (!existing) map.set(key, job); // jobs are ordered by createdAt desc
    }
    return map;
  }, [jobs]);

  const p = project ?? initialProject;
  const scenes = p.scenes ?? [];
  const anyBusy = analyze.isPending || generateImages.isPending || generateVideos.isPending;
  const scenesNeedingImages = scenes.filter((s) => !s.imageAsset).length;
  const scenesNeedingVideos = scenes.filter((s) => s.imageAsset && !s.videoAsset).length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{p.name}</h1>
        <StatusBadge status={p.status} />
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        {p.workflowId} · {p.aspectRatio} · {p.language} · target {p.targetDuration}s
      </p>

      <Card className="mb-5">
        <CardTitle>Script</CardTitle>
        <pre className="whitespace-pre-wrap text-sm text-neutral-300 font-sans mb-4">{p.script}</pre>
        <button
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          onClick={() => analyze.mutate()}
          disabled={anyBusy}
        >
          {analyze.isPending ? 'Analyzing…' : scenes.length > 0 ? 'Re-analyze script' : 'Analyze Script'}
        </button>
        {analyze.isError && <p className="mt-2 text-sm text-red-400">{(analyze.error as Error).message}</p>}
      </Card>

      {scenes.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              className="text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-100 px-3 py-2 rounded-lg"
              onClick={() => generateImages.mutate()}
              disabled={anyBusy || scenesNeedingImages === 0}
            >
              {generateImages.isPending ? 'Queuing…' : `Generate all images (${scenesNeedingImages} pending)`}
            </button>
            <button
              className="text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-100 px-3 py-2 rounded-lg"
              onClick={() => generateVideos.mutate()}
              disabled={anyBusy || scenesNeedingVideos === 0}
            >
              {generateVideos.isPending ? 'Queuing…' : `Generate all videos (${scenesNeedingVideos} pending)`}
            </button>
          </div>

          <div className="space-y-4">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                latestImageJob={latestJobBySceneAndType.get(`${scene.id}:IMAGE_GENERATION`)}
                latestVideoJob={latestJobBySceneAndType.get(`${scene.id}:VIDEO_GENERATION`)}
                busy={regenerateImage.isPending || regenerateVideo.isPending}
                onRegenerateImage={() => regenerateImage.mutate(scene.id)}
                onRegenerateVideo={() => regenerateVideo.mutate(scene.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
