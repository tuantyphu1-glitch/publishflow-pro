import type { VideoProvider, VideoGenerationRequest, VideoGenerationResponse } from './types';

/**
 * Real provider stub for Google Veo 3 (Vertex AI / Gemini API predictLongRunning +
 * polling). Deliberately unimplemented until the mock-only pipeline (Phases 1-7)
 * passes end-to-end -- see ARCHITECTURE.md. Throws a clear, actionable error rather
 * than pretending to succeed.
 */
export class VeoProvider implements VideoProvider {
  readonly id = 'veo';

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('VeoProvider requires VIDEO_API_KEY to be set');
    }
  }

  async generateVideo(_input: VideoGenerationRequest, _onProgress?: (pct: number) => void): Promise<VideoGenerationResponse> {
    throw new Error(
      'VeoProvider is not yet wired up. Configure VIDEO_API_KEY and implement the ' +
        'predictLongRunning + poll cycle in src/providers/video/veoProvider.ts, following ' +
        'PROVIDERS.md. Until then, select the "mock" provider in Provider Config.',
    );
  }
}
