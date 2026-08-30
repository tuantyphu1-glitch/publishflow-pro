import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types';

/**
 * Real provider stub for Google Imagen 3 (or FLUX.1, same shape). Deliberately left
 * unimplemented until Phase 7's mock-only pipeline passes end-to-end (Rule: real
 * providers are wired in only after the mock pipeline works). Throwing a clear,
 * actionable error here matches the "never fake success" rule -- a missing/incomplete
 * provider must be visible, not silently swallowed.
 */
export class ImagenProvider implements ImageProvider {
  readonly id = 'imagen';

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('ImagenProvider requires IMAGE_API_KEY to be set');
    }
  }

  async generateImage(_input: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    throw new Error(
      'ImagenProvider is not yet wired up. Configure IMAGE_API_KEY and implement the Imagen ' +
        'predict() call in src/providers/image/imagenProvider.ts, following PROVIDERS.md. ' +
        'Until then, select the "mock" provider in Provider Config.',
    );
  }
}
