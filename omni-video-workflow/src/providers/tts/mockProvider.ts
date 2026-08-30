import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type { TTSProvider, TTSRequest, TTSResponse } from './types';

const WORDS_PER_MINUTE = 150;
const MIN_DURATION_SECONDS = 1.5;

function estimateDurationSeconds(text: string, speed = 1.0): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const minutes = wordCount / WORDS_PER_MINUTE / Math.max(0.5, speed);
  return Math.max(MIN_DURATION_SECONDS, minutes * 60);
}

/**
 * Generates a real, playable audio file (a soft sine tone, not silence, so the
 * render pipeline's audio-mixing step has something genuine to normalize/mix) whose
 * duration is estimated from the voiceover text length. Tagged provider: 'mock'.
 */
export class MockTTSProvider implements TTSProvider {
  readonly id = 'mock';

  async generateSpeech(input: TTSRequest): Promise<TTSResponse> {
    const durationSeconds = estimateDurationSeconds(input.text, input.speed);
    const outputPath = path.join(os.tmpdir(), `omni-mock-tts-${randomUUID()}.mp3`);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(`sine=frequency=220:duration=${durationSeconds.toFixed(2)}`)
          .inputFormat('lavfi')
          .audioFilters(['volume=0.05'])
          .audioCodec('libmp3lame')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
      });

      const audioBuffer = await fs.readFile(outputPath);
      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        durationSeconds,
        provider: this.id,
        voice: input.voice || 'mock-voice',
        raw: { mock: true, estimatedFromWordCount: true },
      };
    } finally {
      await fs.rm(outputPath, { force: true });
    }
  }
}
