import { describe, it, expect } from 'vitest';
import { evenify } from '@/providers/video/mockProvider';

// Regression test for a real bug found in Phase 4 E2E testing: libx264 + yuv420p
// refuse odd width/height (e.g. 720p @ 9:16 => 720*9/16 = 405, an odd number),
// failing with "width not divisible by 2" and exit code 187.
describe('evenify', () => {
  it('rounds odd numbers to the nearest even number', () => {
    expect(evenify(405)).toBe(406);
    expect(evenify(1215)).toBe(1216); // 1080p @ 9:16 => 1080*9/16 = 607.5 -> rounds oddly upstream too
  });

  it('leaves even numbers unchanged', () => {
    expect(evenify(720)).toBe(720);
    expect(evenify(1280)).toBe(1280);
  });
});
