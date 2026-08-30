export interface VideoGenerationRequest {
  sourceImageBuffer: Buffer;
  motionPrompt: string;
  cameraInstructions?: string;
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: '720p' | '1080p';
}

export interface VideoGenerationResponse {
  videoBuffer: Buffer;
  contentType: string;
  durationSeconds: number;
  provider: string;
  model: string;
  raw: unknown;
}

export interface VideoProvider {
  readonly id: string;
  generateVideo(input: VideoGenerationRequest, onProgress?: (pct: number) => void): Promise<VideoGenerationResponse>;
}
