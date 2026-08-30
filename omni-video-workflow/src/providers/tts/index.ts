import type { TTSProvider } from './types';
import { MockTTSProvider } from './mockProvider';
import { EdgeTTSProvider } from './edgeTtsProvider';

export type { TTSProvider, TTSRequest, TTSResponse } from './types';

export function createTTSProvider(providerId: string): TTSProvider {
  switch (providerId) {
    case 'mock':
      return new MockTTSProvider();
    case 'edge-tts':
      return new EdgeTTSProvider();
    default:
      throw new Error(`Unknown TTS provider id: ${providerId}`);
  }
}
