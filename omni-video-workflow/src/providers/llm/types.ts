export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: 'json' | 'text';
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  raw: unknown;
  provider: string;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number };
}

export interface LLMProvider {
  readonly id: string;
  generateText(input: LLMRequest): Promise<LLMResponse>;
}
