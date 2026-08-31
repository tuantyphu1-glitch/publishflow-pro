import { buildSubtitleCues } from './subtitles';

export interface TimelineTrackItem {
  storageKey: string;
  startSeconds: number;
  durationSeconds: number;
  sceneId: string;
}

export interface Timeline {
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: string;
  totalDurationSeconds: number;
  tracks: {
    video: TimelineTrackItem[];
    voice: TimelineTrackItem[];
    subtitle: { text: string; startSeconds: number; endSeconds: number }[];
  };
}

export interface TimelineSceneInput {
  id: string;
  duration: number;
  voiceover: string;
  videoStorageKey: string | null;
  audioStorageKey: string | null;
}

/**
 * Pure and deterministic: the same scenes (by id, duration, voiceover, and asset
 * keys) always produce the same Timeline. Scene order is the array order --
 * callers must pass scenes already sorted by `index`. A scene missing its video
 * or audio asset is skipped from that track (never crashes the whole render);
 * the caller decides whether that's acceptable before rendering.
 */
export function buildTimeline(params: {
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: string;
  scenes: TimelineSceneInput[];
}): Timeline {
  let cursor = 0;
  const video: TimelineTrackItem[] = [];
  const voice: TimelineTrackItem[] = [];

  for (const scene of params.scenes) {
    if (scene.videoStorageKey) {
      video.push({ storageKey: scene.videoStorageKey, startSeconds: cursor, durationSeconds: scene.duration, sceneId: scene.id });
    }
    if (scene.audioStorageKey) {
      voice.push({ storageKey: scene.audioStorageKey, startSeconds: cursor, durationSeconds: scene.duration, sceneId: scene.id });
    }
    cursor += scene.duration;
  }

  const subtitle = buildSubtitleCues(params.scenes.map((s) => ({ duration: s.duration, voiceover: s.voiceover }))).map((c) => ({
    text: c.text,
    startSeconds: c.startSeconds,
    endSeconds: c.endSeconds,
  }));

  return {
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    totalDurationSeconds: cursor,
    tracks: { video, voice, subtitle },
  };
}
