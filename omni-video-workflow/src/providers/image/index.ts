import type { ImageProvider } from './types';
import { MockImageProvider } from './mockProvider';
import { ImagenProvider } from './imagenProvider';
import { getEnv } from '@/lib/validation/env';

export type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse, ImageReferenceInput } from './types';

export function createImageProvider(providerId: string): ImageProvider {
  switch (providerId) {
    case 'mock':
      return new MockImageProvider();
    case 'imagen':
      return new ImagenProvider(getEnv().IMAGE_API_KEY);
    default:
      throw new Error(`Unknown image provider id: ${providerId}`);
  }
}
