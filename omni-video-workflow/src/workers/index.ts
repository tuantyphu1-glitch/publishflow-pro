import { Worker, type Job } from 'bullmq';
import { getRedisConnection } from '@/lib/queue/connection';
import {
  QUEUE_NAMES,
  type ScriptAnalysisJobData,
  type ImageGenerationJobData,
  type VideoGenerationJobData,
  type TTSGenerationJobData,
  type RenderJobData,
} from '@/lib/queue/queues';
import { markJobProcessing, markJobCompleted, markJobFailed } from '@/lib/workflow/jobs';
import { runScriptAnalysis } from '@/lib/workflow/processors/scriptAnalysisProcessor';
import { runImageGeneration } from '@/lib/workflow/processors/imageGenerationProcessor';
import { runVideoGeneration } from '@/lib/workflow/processors/videoGenerationProcessor';
import { runTTSGeneration } from '@/lib/workflow/processors/ttsProcessor';
import { runRender } from '@/lib/workflow/processors/renderProcessor';
import { logger } from '@/lib/logger';

/**
 * Wraps a processor with the GenerationJob lifecycle: PROCESSING on start,
 * COMPLETED with output on success. Failure is NOT written here -- the worker's
 * 'failed' event handles that, because only there do we know whether BullMQ has
 * exhausted its retries (job.attemptsMade >= job.opts.attempts) or will retry again.
 */
function wrapProcessor<TData extends { generationJobId: string }, TResult>(fn: (data: TData) => Promise<TResult>) {
  return async (job: Job<TData>) => {
    await markJobProcessing(job.data.generationJobId);
    const result = await fn(job.data);
    await markJobCompleted(job.data.generationJobId, result as object);
    return result;
  };
}

function registerFailureHandler(worker: Worker, queueLabel: string) {
  worker.on('failed', async (job, err) => {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    const final = job.attemptsMade >= attempts;
    logger.warn('job_attempt_failed', {
      queue: queueLabel,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      attempts,
      final,
      error: String(err),
    });
    await markJobFailed(job.data.generationJobId, err, final);
  });
  worker.on('error', (err) => logger.error('worker_error', { queue: queueLabel, error: String(err) }));
}

function startWorkers() {
  const connection = getRedisConnection();

  const scriptAnalysisWorker = new Worker<ScriptAnalysisJobData>(
    QUEUE_NAMES.scriptAnalysis,
    wrapProcessor(runScriptAnalysis),
    { connection, concurrency: 2 },
  );
  registerFailureHandler(scriptAnalysisWorker, QUEUE_NAMES.scriptAnalysis);

  const imageWorker = new Worker<ImageGenerationJobData>(
    QUEUE_NAMES.imageGeneration,
    wrapProcessor(runImageGeneration),
    { connection, concurrency: 3 },
  );
  registerFailureHandler(imageWorker, QUEUE_NAMES.imageGeneration);

  const videoWorker = new Worker<VideoGenerationJobData>(
    QUEUE_NAMES.videoGeneration,
    wrapProcessor(runVideoGeneration),
    { connection, concurrency: 2 },
  );
  registerFailureHandler(videoWorker, QUEUE_NAMES.videoGeneration);

  const ttsWorker = new Worker<TTSGenerationJobData>(
    QUEUE_NAMES.ttsGeneration,
    wrapProcessor(runTTSGeneration),
    { connection, concurrency: 4 },
  );
  registerFailureHandler(ttsWorker, QUEUE_NAMES.ttsGeneration);

  // Render is CPU-bound (ffmpeg) and touches every scene at once -- keep it to one at a time.
  const renderWorker = new Worker<RenderJobData>(
    QUEUE_NAMES.render,
    wrapProcessor(runRender),
    { connection, concurrency: 1 },
  );
  registerFailureHandler(renderWorker, QUEUE_NAMES.render);

  logger.info('workers_started', { queues: Object.values(QUEUE_NAMES) });

  const shutdown = async () => {
    logger.info('workers_shutting_down', {});
    await Promise.all([scriptAnalysisWorker.close(), imageWorker.close(), videoWorker.close(), ttsWorker.close(), renderWorker.close()]);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startWorkers();
