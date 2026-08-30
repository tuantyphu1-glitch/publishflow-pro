import type { LLMProvider, LLMRequest, LLMResponse } from './types';

/**
 * Deterministic mock: when asked for JSON, it naively splits the user's script into
 * 3-5 sentence-based "scenes" and returns a schema-valid ScriptAnalysisOutput every
 * time. It does not understand the script -- it exists to exercise the full pipeline
 * (script -> scenes -> images -> video -> voice -> render) with zero external API calls.
 */
export class MockLLMProvider implements LLMProvider {
  readonly id = 'mock';

  async generateText(input: LLMRequest): Promise<LLMResponse> {
    const text = input.responseFormat === 'json' ? this.buildMockScriptAnalysis(input.userPrompt) : this.buildMockText(input.userPrompt);

    return {
      text,
      raw: { mock: true },
      provider: this.id,
      model: 'mock-llm-v1',
      usage: { inputTokens: input.userPrompt.length, outputTokens: text.length },
    };
  }

  private buildMockText(prompt: string): string {
    return `[mock LLM output for prompt of length ${prompt.length}]`;
  }

  private buildMockScriptAnalysis(script: string): string {
    const sentences = script
      .split(/(?<=[.!?…])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const sceneCount = Math.min(5, Math.max(3, Math.min(sentences.length, 5)));
    const chunkSize = Math.max(1, Math.ceil(sentences.length / sceneCount));
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(' '));
    }
    while (chunks.length < 3) chunks.push('(mock filler scene — script too short to split further)');

    const scenes = chunks.slice(0, 5).map((chunk, i) => ({
      id: i + 1,
      duration: 8,
      voiceover: chunk,
      visualDescription: `Mock visual for scene ${i + 1}: ${chunk.slice(0, 80)}`,
      imagePrompt: `Mock image prompt, scene ${i + 1}: ${chunk.slice(0, 80)}`,
      videoPrompt: `Mock motion: slow push-in, scene ${i + 1}`,
      camera: 'medium shot',
      movement: 'slow push-in',
      lighting: 'soft daylight',
      transition: 'cut',
    }));

    const output = {
      project: {
        title: 'Mock Analyzed Project',
        summary: script.slice(0, 160),
        language: 'vi',
        targetDuration: scenes.length * 8,
      },
      characters: [],
      products: [],
      scenes,
    };
    return JSON.stringify(output);
  }
}
