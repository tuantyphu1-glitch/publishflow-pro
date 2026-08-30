export interface ImageReferenceInput {
  url: string;
  role: 'character' | 'product';
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: ImageReferenceInput[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  seed?: number;
}

export interface ImageGenerationResponse {
  imageBuffer: Buffer;
  contentType: string;
  provider: string;
  model: string;
  seed?: number;
  raw: unknown;
}

export interface ImageProvider {
  readonly id: string;
  generateImage(input: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  /** Optional: only implemented by vision-capable providers, used for QC scoring. */
  describeImage?(imageBuffer: Buffer, question: string): Promise<string>;
}
