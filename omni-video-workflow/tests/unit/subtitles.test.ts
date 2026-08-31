import { describe, it, expect } from 'vitest';
import { buildSubtitleCues, buildSrt } from '@/lib/rendering/subtitles';

describe('buildSubtitleCues', () => {
  it('produces contiguous, non-overlapping cues matching cumulative scene durations', () => {
    const cues = buildSubtitleCues([
      { duration: 8, voiceover: 'A' },
      { duration: 5, voiceover: 'B' },
      { duration: 10, voiceover: 'C' },
    ]);
    expect(cues).toEqual([
      { index: 1, startSeconds: 0, endSeconds: 8, text: 'A' },
      { index: 2, startSeconds: 8, endSeconds: 13, text: 'B' },
      { index: 3, startSeconds: 13, endSeconds: 23, text: 'C' },
    ]);
  });

  it('is deterministic for the same input', () => {
    const input = [{ duration: 7, voiceover: 'X' }];
    expect(buildSubtitleCues(input)).toEqual(buildSubtitleCues(input));
  });
});

describe('buildSrt', () => {
  it('formats a valid SRT block with correct HH:MM:SS,mmm timestamps', () => {
    const srt = buildSrt([
      { duration: 8, voiceover: 'Hello' },
      { duration: 65, voiceover: 'World' },
    ]);
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:08,000\nHello\n');
    expect(srt).toContain('2\n00:00:08,000 --> 00:01:13,000\nWorld\n');
  });
});
