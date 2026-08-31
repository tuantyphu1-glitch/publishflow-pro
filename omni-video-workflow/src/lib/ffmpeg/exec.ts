import { execFile } from 'child_process';
import { promisify } from 'util';
import { getEnv } from '@/lib/validation/env';

const execFileAsync = promisify(execFile);

/**
 * Runs one ffmpeg invocation to completion. The render pipeline is several
 * discrete, easy-to-debug stages (conform audio, concat video, burn subtitles,
 * mux) rather than one giant filter_complex graph -- each stage is independently
 * testable by hand and fails with an ffmpeg-native error message, never silently.
 */
export async function runFfmpeg(args: string[]): Promise<void> {
  const binary = getEnv().FFMPEG_PATH || 'ffmpeg';
  try {
    await execFileAsync(binary, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 1024 * 1024 * 64 });
  } catch (err) {
    const stderr = err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : '';
    throw new Error(`ffmpeg failed (${args.join(' ')}): ${stderr || (err instanceof Error ? err.message : String(err))}`);
  }
}

/** ffprobe wrapper used to read back a generated file's actual duration, for validation. */
export async function probeDurationSeconds(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const value = parseFloat(stdout.trim());
  if (Number.isNaN(value)) throw new Error(`ffprobe returned a non-numeric duration for ${filePath}: "${stdout}"`);
  return value;
}
