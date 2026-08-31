import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { runFfmpeg, probeDurationSeconds } from '@/lib/ffmpeg/exec';
import { buildTimeline } from '@/lib/rendering/timeline';
import { buildSrt } from '@/lib/rendering/subtitles';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';
import { markJobProgress } from '@/lib/workflow/jobs';
import type { RenderJobData } from '@/lib/queue/queues';

const SUBTITLE_FORCE_STYLE =
  "FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=60";

export class RenderValidationError extends Error {}

export async function runRender(data: RenderJobData): Promise<{ assetId: string; url: string; durationSeconds: number }> {
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error(`Project not found: ${data.projectId}`);

  const scenes = await db.scene.findMany({
    where: { projectId: data.projectId },
    orderBy: { index: 'asc' },
    include: { videoAsset: true, audioAsset: true },
  });
  const missingVideo = scenes.filter((s) => !s.videoAsset);
  if (scenes.length === 0 || missingVideo.length > 0) {
    throw new RenderValidationError(
      missingVideo.length > 0
        ? `Cannot render: scene(s) ${missingVideo.map((s) => s.index + 1).join(', ')} have no video clip yet.`
        : 'Cannot render: project has no scenes.',
    );
  }

  const timeline = buildTimeline({
    aspectRatio: aspectRatioFromEnum(project.aspectRatio),
    resolution: project.resolution,
    scenes: scenes.map((s) => ({
      id: s.id,
      duration: s.duration,
      voiceover: s.voiceover,
      videoStorageKey: s.videoAsset?.storageKey ?? null,
      audioStorageKey: s.audioAsset?.storageKey ?? null,
    })),
  });

  const storage = getStorageProvider();
  const workDir = path.join(os.tmpdir(), `omni-render-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    await markJobProgress(data.generationJobId, 5);

    // 1. Download every scene's video clip and conform its audio to exactly scene.duration
    //    (pad with silence if the voiceover is shorter, trim if longer -- keeps the video
    //    and audio tracks in lockstep per scene without needing to re-time the video clips).
    const videoFiles: string[] = [];
    const audioFiles: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const videoPath = path.join(workDir, `video-${i}.mp4`);
      const videoBuffer = await storage.download(scene.videoAsset!.storageKey);
      await fs.writeFile(videoPath, videoBuffer);
      videoFiles.push(videoPath);

      const conformedPath = path.join(workDir, `audio-${i}.m4a`);
      if (scene.audioAsset) {
        const rawPath = path.join(workDir, `raw-audio-${i}.mp3`);
        await fs.writeFile(rawPath, await storage.download(scene.audioAsset.storageKey));
        await runFfmpeg([
          '-i', rawPath,
          '-af', 'apad',
          '-t', String(scene.duration),
          '-ar', '44100', '-ac', '2', '-c:a', 'aac',
          conformedPath,
        ]);
      } else {
        await runFfmpeg([
          '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
          '-t', String(scene.duration),
          '-c:a', 'aac',
          conformedPath,
        ]);
      }
      audioFiles.push(conformedPath);
      await markJobProgress(data.generationJobId, 5 + Math.round((30 * (i + 1)) / scenes.length));
    }

    // 2. Concat all scene video clips (identical codec/resolution per project -> safe to copy).
    const videoListPath = path.join(workDir, 'video-list.txt');
    await fs.writeFile(videoListPath, videoFiles.map((f) => `file '${f}'`).join('\n'));
    const concatVideoPath = path.join(workDir, 'concat-video.mp4');
    await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', videoListPath, '-c', 'copy', concatVideoPath]);
    await markJobProgress(data.generationJobId, 45);

    // 3. Concat the per-scene conformed audio into one track spanning the same total duration.
    const audioListPath = path.join(workDir, 'audio-list.txt');
    await fs.writeFile(audioListPath, audioFiles.map((f) => `file '${f}'`).join('\n'));
    const concatAudioPath = path.join(workDir, 'concat-audio.m4a');
    await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', audioListPath, '-c:a', 'aac', concatAudioPath]);
    await markJobProgress(data.generationJobId, 55);

    // 4. Burn subtitles onto the silent video track.
    const srtPath = path.join(workDir, 'captions.srt');
    await fs.writeFile(srtPath, buildSrt(scenes.map((s) => ({ duration: s.duration, voiceover: s.voiceover }))));
    const subtitledVideoPath = path.join(workDir, 'subtitled-video.mp4');
    await runFfmpeg([
      '-i', concatVideoPath,
      '-vf', `subtitles=${escapeFfmpegPath(srtPath)}:force_style='${SUBTITLE_FORCE_STYLE}'`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-an',
      subtitledVideoPath,
    ]);
    await markJobProgress(data.generationJobId, 80);

    // 5. Mux the subtitled video with the concatenated voiceover track.
    const finalPath = path.join(workDir, 'final.mp4');
    await runFfmpeg([
      '-i', subtitledVideoPath,
      '-i', concatAudioPath,
      '-c:v', 'copy', '-c:a', 'aac',
      '-shortest', '-movflags', '+faststart',
      finalPath,
    ]);
    await markJobProgress(data.generationJobId, 92);

    const durationSeconds = await probeDurationSeconds(finalPath);
    const finalBuffer = await fs.readFile(finalPath);
    const storageKey = `projects/${project.id}/render/final.mp4`;
    const { url } = await storage.upload({ key: storageKey, data: finalBuffer, contentType: 'video/mp4' });

    const asset = await db.asset.create({
      data: {
        type: 'FINAL_VIDEO',
        storageKey,
        url,
        provider: 'omni-render',
        durationSeconds,
        metadata: { timeline } as object,
      },
    });

    await db.$transaction([
      db.render.update({
        where: { id: data.renderId },
        data: { status: 'COMPLETED', outputKey: storageKey, outputUrl: url, timelineJson: timeline as object, finishedAt: new Date() },
      }),
      db.project.update({ where: { id: project.id }, data: { status: 'COMPLETED' } }),
    ]);

    return { assetId: asset.id, url, durationSeconds };
  } catch (err) {
    await db.render.update({
      where: { id: data.renderId },
      data: { status: 'FAILED', errorText: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

function escapeFfmpegPath(p: string): string {
  // ffmpeg's subtitles filter treats ':' as an option separator, even inside the path.
  return p.replace(/:/g, '\\:');
}
