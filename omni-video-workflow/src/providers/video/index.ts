import type { VideoProvider } from './types';
import { MockVideoProvider } from './mockProvider';
import { VeoProvider } from './veoProvider';
import { getEnv } from '@/lib/validation/env';

export type { VideoProvider, VideoGenerationRequest, VideoGenerationResponse } from './types';

export function createVideoProvider(providerId: string): VideoProvider {
  switch (providerId) {
    case 'mock':
      return new MockVideoProvider();
    case 'veo':
      return new VeoProvider(getEnv().VIDEO_API_KEY);
    default:
      throw new Error(`Unknown video provider id: ${providerId}`);
  }
}
