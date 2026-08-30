'use client';

import type { SceneDTO, GenerationJobDTO } from './types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IMAGE_QUEUED: 'Image queued…',
  IMAGE_READY: 'Image ready',
  VIDEO_QUEUED: 'Video queued…',
  VIDEO_READY: 'Video ready',
  VOICE_READY: 'Voice ready',
  APPROVED: 'Approved',
  FAILED: 'Failed',
};

export function SceneCard({
  scene,
  latestImageJob,
  latestVideoJob,
  onRegenerateImage,
  onRegenerateVideo,
  busy,
}: {
  scene: SceneDTO;
  latestImageJob?: GenerationJobDTO;
  latestVideoJob?: GenerationJobDTO;
  onRegenerateImage: () => void;
  onRegenerateVideo: () => void;
  busy: boolean;
}) {
  const imagePending = latestImageJob && ['QUEUED', 'PROCESSING'].includes(latestImageJob.status);
  const videoPending = latestVideoJob && ['QUEUED', 'PROCESSING'].includes(latestVideoJob.status);

  return (
    <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-neutral-300">
          Scene {scene.index + 1} · {scene.duration}s
        </div>
        <span className="text-[11px] text-neutral-500">{STATUS_LABEL[scene.status] ?? scene.status}</span>
      </div>

      <p className="text-sm text-neutral-200 mb-3">{scene.voiceover}</p>
      <p className="text-xs text-neutral-500 mb-4">{scene.visualDescription}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="aspect-[9/16] max-h-56 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
            {scene.imageAsset ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamically generated media, no fixed dimensions
              <img src={scene.imageAsset.url} alt={`Scene ${scene.index + 1}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] text-neutral-600">{imagePending ? 'Generating…' : 'No image yet'}</span>
            )}
          </div>
          <button
            className="mt-2 w-full text-xs bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-lg py-1.5"
            onClick={onRegenerateImage}
            disabled={busy || imagePending}
          >
            {imagePending ? 'Generating…' : scene.imageAsset ? 'Regenerate image' : 'Generate image'}
          </button>
          {latestImageJob?.status === 'FAILED' && (
            <p className="mt-1 text-[11px] text-red-400">{latestImageJob.lastError}</p>
          )}
        </div>

        <div>
          <div className="aspect-[9/16] max-h-56 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
            {scene.videoAsset ? (
              <video src={scene.videoAsset.url} controls className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] text-neutral-600">{videoPending ? 'Generating…' : 'No video yet'}</span>
            )}
          </div>
          <button
            className="mt-2 w-full text-xs bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-lg py-1.5"
            onClick={onRegenerateVideo}
            disabled={busy || videoPending || !scene.imageAsset}
          >
            {videoPending
              ? `Generating… ${latestVideoJob?.progressPct ?? 0}%`
              : scene.videoAsset
                ? 'Regenerate video'
                : scene.imageAsset
                  ? 'Generate video'
                  : 'Needs an image first'}
          </button>
          {latestVideoJob?.status === 'FAILED' && (
            <p className="mt-1 text-[11px] text-red-400">{latestVideoJob.lastError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
