import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMRequest, LLMResponse } from './types';

/**
 * Real provider: Google Gemini via @google/generative-ai. Server-side only --
 * never import this module from client components. Requires LLM_API_KEY.
 */
export class GeminiLLMProvider implements LLMProvider {
  readonly id = 'gemini';
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-1.5-flash') {
    if (!apiKey) {
      throw new Error('GeminiLLMProvider requires LLM_API_KEY to be set');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generateText(input: LLMRequest): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: input.systemPrompt,
      generationConfig: {
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        responseMimeType: input.responseFormat === 'json' ? 'application/json' : 'text/plain',
      },
    });

    const result = await model.generateContent(input.userPrompt);
    const text = result.response.text();

    return {
      text,
      raw: result.response,
      provider: this.id,
      model: this.modelName,
      usage: {
        inputTokens: result.response.usageMetadata?.promptTokenCount,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
