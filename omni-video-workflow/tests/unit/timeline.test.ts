import { describe, it, expect } from 'vitest';
import { buildTimeline } from '@/lib/rendering/timeline';

const scenes = [
  { id: 's1', duration: 8, voiceover: 'One', videoStorageKey: 'v1.mp4', audioStorageKey: 'a1.mp3' },
  { id: 's2', duration: 6, voiceover: 'Two', videoStorageKey: 'v2.mp4', audioStorageKey: null },
  { id: 's3', duration: 9, voiceover: 'Three', videoStorageKey: null, audioStorageKey: 'a3.mp3' },
];

describe('buildTimeline', () => {
  it('lays out video/voice tracks back-to-back and computes total duration', () => {
    const timeline = buildTimeline({ aspectRatio: '9:16', resolution: '1080x1920', scenes });
    expect(timeline.totalDurationSeconds).toBe(23);
    expect(timeline.tracks.video).toEqual([
      { storageKey: 'v1.mp4', startSeconds: 0, durationSeconds: 8, sceneId: 's1' },
      { storageKey: 'v2.mp4', startSeconds: 8, durationSeconds: 6, sceneId: 's2' },
    ]);
    expect(timeline.tracks.voice).toEqual([
      { storageKey: 'a1.mp3', startSeconds: 0, durationSeconds: 8, sceneId: 's1' },
      { storageKey: 'a3.mp3', startSeconds: 14, durationSeconds: 9, sceneId: 's3' },
    ]);
  });

  it('skips scenes missing an asset from that track without crashing', () => {
    const timeline = buildTimeline({ aspectRatio: '16:9', resolution: '1920x1080', scenes });
    expect(timeline.tracks.video).toHaveLength(2);
    expect(timeline.tracks.voice).toHaveLength(2);
  });

  it('subtitle track always covers every scene regardless of missing assets', () => {
    const timeline = buildTimeline({ aspectRatio: '1:1', resolution: '1080x1080', scenes });
    expect(timeline.tracks.subtitle).toHaveLength(3);
    expect(timeline.tracks.subtitle[2]).toEqual({ text: 'Three', startSeconds: 14, endSeconds: 23 });
  });

  it('is a pure function: identical input produces identical output', () => {
    const a = buildTimeline({ aspectRatio: '9:16', resolution: '1080x1920', scenes });
    const b = buildTimeline({ aspectRatio: '9:16', resolution: '1080x1920', scenes });
    expect(a).toEqual(b);
  });
});
