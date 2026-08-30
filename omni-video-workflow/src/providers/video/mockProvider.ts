import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type { VideoProvider, VideoGenerationRequest, VideoGenerationResponse } from './types';

const RESOLUTION_HEIGHT: Record<VideoGenerationRequest['resolution'], number> = {
  '720p': 720,
  '1080p': 1080,
};

/**
 * Real image-to-video synthesis using ffmpeg (not a fake/no-op): loops the source
 * image for `durationSeconds`, applies a slow zoom (Ken Burns effect) so the output
 * is a genuine, playable, non-trivial video clip -- suitable for exercising the full
 * render pipeline downstream. Tagged provider: 'mock' so it's never confused with a
 * real Veo-generated clip.
 */
export class MockVideoProvider implements VideoProvider {
  readonly id = 'mock';

  async generateVideo(input: VideoGenerationRequest, onProgress?: (pct: number) => void): Promise<VideoGenerationResponse> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `omni-mock-src-${randomUUID()}.png`);
    const outputPath = path.join(tmpDir, `omni-mock-out-${randomUUID()}.mp4`);
    await fs.writeFile(inputPath, input.sourceImageBuffer);

    const targetHeight = RESOLUTION_HEIGHT[input.resolution];
    const targetWidth = input.aspectRatio === '16:9' ? Math.round((targetHeight * 16) / 9) : input.aspectRatio === '1:1' ? targetHeight : Math.round((targetHeight * 9) / 16);
    const fps = 30;
    const totalFrames = Math.max(1, Math.round(input.durationSeconds * fps));

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .loop(input.durationSeconds)
          .videoFilters([
            `scale=${targetWidth * 2}:${targetHeight * 2}`,
            `zoompan=z='min(zoom+0.0008,1.15)':d=${totalFrames}:s=${targetWidth}x${targetHeight}:fps=${fps}`,
            `format=yuv420p`,
          ])
          .outputOptions(['-t', String(input.durationSeconds), '-movflags', '+faststart'])
          .videoCodec('libx264')
          .noAudio()
          .on('progress', (p) => {
            if (onProgress && p.percent) onProgress(Math.min(99, Math.round(p.percent)));
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
      });

      const videoBuffer = await fs.readFile(outputPath);
      onProgress?.(100);

      return {
        videoBuffer,
        contentType: 'video/mp4',
        durationSeconds: input.durationSeconds,
        provider: this.id,
        model: 'mock-video-v1-ffmpeg-kenburns',
        raw: { mock: true, motionPrompt: input.motionPrompt },
      };
    } finally {
      await fs.rm(inputPath, { force: true });
      await fs.rm(outputPath, { force: true });
    }
  }
}
