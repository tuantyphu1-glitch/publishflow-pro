import sharp from 'sharp';
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types';

const DIMENSIONS: Record<ImageGenerationRequest['aspectRatio'], { width: number; height: number }> = {
  '9:16': { width: 720, height: 1280 },
  '16:9': { width: 1280, height: 720 },
  '1:1': { width: 1024, height: 1024 },
};

function hashToColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 35%)`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Renders a solid-color placeholder image with the prompt text overlaid, so scenes
 * remain visually distinguishable in the storyboard even without a real image model.
 * Never confused with real output: Asset.provider is always 'mock' for these.
 */
export class MockImageProvider implements ImageProvider {
  readonly id = 'mock';

  async generateImage(input: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const { width, height } = DIMENSIONS[input.aspectRatio];
    const bg = hashToColor(input.prompt);
    const wrapped = wrapText(input.prompt, 34).slice(0, 6);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bg}" />
        <text x="24" y="48" font-family="sans-serif" font-size="28" fill="white" opacity="0.85">MOCK IMAGE</text>
        ${wrapped
          .map(
            (line, i) =>
              `<text x="24" y="${100 + i * 34}" font-family="sans-serif" font-size="22" fill="white">${escapeXml(line)}</text>`,
          )
          .join('\n')}
        ${
          input.referenceImages && input.referenceImages.length > 0
            ? `<text x="24" y="${height - 24}" font-family="sans-serif" font-size="18" fill="white" opacity="0.7">refs: ${input.referenceImages.length}</text>`
            : ''
        }
      </svg>`;

    const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return {
      imageBuffer,
      contentType: 'image/png',
      provider: this.id,
      model: 'mock-image-v1',
      seed: input.seed,
      raw: { mock: true },
    };
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}
