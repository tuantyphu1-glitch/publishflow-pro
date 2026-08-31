import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';

export const QUEUE_NAMES = {
  scriptAnalysis: 'script-analysis',
  imageGeneration: 'image-generation',
  videoGeneration: 'video-generation',
  ttsGeneration: 'tts-generation',
  render: 'render',
} as const;

export interface ScriptAnalysisJobData {
  generationJobId: string;
  projectId: string;
}
export interface ImageGenerationJobData {
  generationJobId: string;
  projectId: string;
  sceneId: string;
}
export interface VideoGenerationJobData {
  generationJobId: string;
  projectId: string;
  sceneId: string;
}
export interface TTSGenerationJobData {
  generationJobId: string;
  projectId: string;
  sceneId: string;
}
export interface RenderJobData {
  generationJobId: string;
  projectId: string;
  renderId: string;
}

const queues: Partial<Record<string, Queue>> = {};

function getQueue<T>(name: string): Queue<T> {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getRedisConnection() });
  }
  return queues[name] as Queue<T>;
}

export const scriptAnalysisQueue = () => getQueue<ScriptAnalysisJobData>(QUEUE_NAMES.scriptAnalysis);
export const imageGenerationQueue = () => getQueue<ImageGenerationJobData>(QUEUE_NAMES.imageGeneration);
export const videoGenerationQueue = () => getQueue<VideoGenerationJobData>(QUEUE_NAMES.videoGeneration);
export const ttsGenerationQueue = () => getQueue<TTSGenerationJobData>(QUEUE_NAMES.ttsGeneration);
export const renderQueue = () => getQueue<RenderJobData>(QUEUE_NAMES.render);

/** Default retry policy for every job: 3 attempts, exponential backoff capped at 30s. */
export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};
