export interface TTSRequest {
  text: string;
  language: string;
  voice: string;
  speed?: number;
  style?: string;
}

export interface TTSResponse {
  audioBuffer: Buffer;
  contentType: string;
  durationSeconds: number;
  provider: string;
  voice: string;
  raw: unknown;
}

export interface TTSProvider {
  readonly id: string;
  generateSpeech(input: TTSRequest): Promise<TTSResponse>;
}
