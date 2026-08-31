export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Deterministic: cue N's start is the sum of every prior scene's duration, so
 * subtitle timing always matches the video timeline's scene boundaries exactly
 * (both are built from the same `duration` field -- see timeline.ts).
 */
export function buildSubtitleCues(scenes: { duration: number; voiceover: string }[]): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let cursor = 0;
  scenes.forEach((scene, i) => {
    const start = cursor;
    const end = cursor + scene.duration;
    cues.push({ index: i + 1, startSeconds: start, endSeconds: end, text: scene.voiceover });
    cursor = end;
  });
  return cues;
}

function formatSrtTimestamp(totalSeconds: number): string {
  const ms = Math.round(totalSeconds * 1000);
  const hh = Math.floor(ms / 3_600_000);
  const mm = Math.floor((ms % 3_600_000) / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  const mmm = ms % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(mmm, 3)}`;
}

export function buildSrt(scenes: { duration: number; voiceover: string }[]): string {
  const cues = buildSubtitleCues(scenes);
  return cues
    .map((c) => `${c.index}\n${formatSrtTimestamp(c.startSeconds)} --> ${formatSrtTimestamp(c.endSeconds)}\n${c.text}\n`)
    .join('\n');
}
