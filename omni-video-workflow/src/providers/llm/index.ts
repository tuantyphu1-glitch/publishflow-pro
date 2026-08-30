import type { LLMProvider } from './types';
import { MockLLMProvider } from './mockProvider';
import { GeminiLLMProvider } from './geminiProvider';
import { getEnv } from '@/lib/validation/env';

export type { LLMProvider, LLMRequest, LLMResponse } from './types';

/**
 * The only place (besides the concrete provider modules themselves) allowed to
 * construct a provider instance. Never call `new GeminiLLMProvider()` etc. from
 * the workflow engine or API routes -- go through this factory so a new provider
 * can be added without touching orchestration code.
 */
export function createLLMProvider(providerId: string): LLMProvider {
  switch (providerId) {
    case 'mock':
      return new MockLLMProvider();
    case 'gemini':
      return new GeminiLLMProvider(getEnv().LLM_API_KEY);
    default:
      throw new Error(`Unknown LLM provider id: ${providerId}`);
  }
}
