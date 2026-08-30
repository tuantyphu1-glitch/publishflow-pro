import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createLLMProvider, type LLMProvider } from '@/providers/llm';
import { createImageProvider, type ImageProvider } from '@/providers/image';
import { createVideoProvider, type VideoProvider } from '@/providers/video';
import { createTTSProvider, type TTSProvider } from '@/providers/tts';

/**
 * The workflow engine, API routes, and UI never import a concrete provider
 * constructor directly -- they call one of these resolvers, which reads the active
 * ProviderConfig row for the requested capability out of the database and hands
 * back the matching provider instance. Adding a new provider means: implement the
 * interface, add one `case` in the relevant providers/<capability>/index.ts
 * factory, and insert a ProviderConfig row -- zero changes to orchestration code.
 */

async function resolveProviderId(capability: 'LLM' | 'IMAGE' | 'VIDEO' | 'TTS'): Promise<string> {
  const config = await db.providerConfig.findFirst({
    where: { capability, isPrimary: true },
  });
  if (!config) {
    logger.warn('provider_config_missing_defaulting_to_mock', { capability });
    return 'mock';
  }
  return config.providerId;
}

async function resolveFallbackProviderId(capability: 'LLM' | 'IMAGE' | 'VIDEO' | 'TTS'): Promise<string | null> {
  const config = await db.providerConfig.findFirst({
    where: { capability, isFallback: true },
  });
  return config?.providerId ?? null;
}

export async function getLLMProvider(): Promise<LLMProvider> {
  return createLLMProvider(await resolveProviderId('LLM'));
}
export async function getImageProvider(): Promise<ImageProvider> {
  return createImageProvider(await resolveProviderId('IMAGE'));
}
export async function getVideoProvider(): Promise<VideoProvider> {
  return createVideoProvider(await resolveProviderId('VIDEO'));
}
export async function getTTSProvider(): Promise<TTSProvider> {
  return createTTSProvider(await resolveProviderId('TTS'));
}

export async function getLLMFallbackProvider(): Promise<LLMProvider | null> {
  const id = await resolveFallbackProviderId('LLM');
  return id ? createLLMProvider(id) : null;
}
export async function getImageFallbackProvider(): Promise<ImageProvider | null> {
  const id = await resolveFallbackProviderId('IMAGE');
  return id ? createImageProvider(id) : null;
}
export async function getVideoFallbackProvider(): Promise<VideoProvider | null> {
  const id = await resolveFallbackProviderId('VIDEO');
  return id ? createVideoProvider(id) : null;
}
export async function getTTSFallbackProvider(): Promise<TTSProvider | null> {
  const id = await resolveFallbackProviderId('TTS');
  return id ? createTTSProvider(id) : null;
}

/**
 * Runs `request` against `primary`, falling back to `fallback` on any thrown error
 * (Section 23: Provider Fallback). Always records a UsageRecord -- success or
 * failure -- for every provider actually attempted.
 */
export async function withFallback<TReq, TRes>(
  request: TReq,
  primary: { id: string; run: (r: TReq) => Promise<TRes> },
  fallback: { id: string; run: (r: TReq) => Promise<TRes> } | null,
  usage: { operation: string; projectId?: string; estimateCost?: (res: TRes) => number },
): Promise<TRes> {
  const start = Date.now();
  try {
    const res = await primary.run(request);
    await recordUsage({
      provider: primary.id,
      operation: usage.operation,
      projectId: usage.projectId,
      durationMs: Date.now() - start,
      success: true,
      estimatedCost: usage.estimateCost ? usage.estimateCost(res) : 0,
    });
    return res;
  } catch (err) {
    await recordUsage({
      provider: primary.id,
      operation: usage.operation,
      projectId: usage.projectId,
      durationMs: Date.now() - start,
      success: false,
      estimatedCost: 0,
    });
    if (!fallback) throw err;
    logger.warn('provider_fallback', { from: primary.id, to: fallback.id, operation: usage.operation, error: String(err) });
    const fbStart = Date.now();
    try {
      const res = await fallback.run(request);
      await recordUsage({
        provider: fallback.id,
        operation: usage.operation,
        projectId: usage.projectId,
        durationMs: Date.now() - fbStart,
        success: true,
        estimatedCost: usage.estimateCost ? usage.estimateCost(res) : 0,
      });
      return res;
    } catch (fbErr) {
      await recordUsage({
        provider: fallback.id,
        operation: usage.operation,
        projectId: usage.projectId,
        durationMs: Date.now() - fbStart,
        success: false,
        estimatedCost: 0,
      });
      throw fbErr;
    }
  }
}

export async function recordUsage(params: {
  provider: string;
  model?: string;
  operation: string;
  projectId?: string;
  estimatedCost?: number;
  creditsUsed?: number;
  durationMs?: number;
  success: boolean;
}): Promise<void> {
  await db.usageRecord.create({
    data: {
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      projectId: params.projectId,
      estimatedCost: params.estimatedCost ?? 0,
      creditsUsed: params.creditsUsed,
      durationMs: params.durationMs,
      success: params.success,
    },
  });
}
