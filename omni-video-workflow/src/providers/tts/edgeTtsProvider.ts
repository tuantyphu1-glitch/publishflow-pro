import type { TTSProvider, TTSRequest, TTSResponse } from './types';

/**
 * Real provider stub for Edge-TTS (free, no API key required by the service itself,
 * but still routed through this adapter so the engine never talks to a vendor SDK
 * directly). Deliberately unimplemented until the mock-only pipeline passes
 * end-to-end. See PROVIDERS.md for the WebSocket protocol notes.
 */
export class EdgeTTSProvider implements TTSProvider {
  readonly id = 'edge-tts';

  async generateSpeech(_input: TTSRequest): Promise<TTSResponse> {
    throw new Error(
      'EdgeTTSProvider is not yet wired up. Implement the Edge read-aloud WebSocket ' +
        'protocol in src/providers/tts/edgeTtsProvider.ts, following PROVIDERS.md. ' +
        'Until then, select the "mock" provider in Provider Config.',
    );
  }
}
