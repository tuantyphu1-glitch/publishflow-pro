import { describe, it, expect } from 'vitest';
import { MockLLMProvider } from '@/providers/llm/mockProvider';
import { ScriptAnalysisOutputSchema } from '@/lib/validation/schemas';

describe('MockLLMProvider', () => {
  const provider = new MockLLMProvider();

  it('returns schema-valid ScriptAnalysisOutput for a short script', async () => {
    const res = await provider.generateText({
      systemPrompt: 'irrelevant for mock',
      userPrompt: 'Đây là một câu duy nhất.',
      responseFormat: 'json',
    });
    const parsed = ScriptAnalysisOutputSchema.safeParse(JSON.parse(res.text));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it('returns schema-valid ScriptAnalysisOutput for a long multi-sentence script', async () => {
    const script = Array.from({ length: 20 }, (_, i) => `Câu số ${i + 1}.`).join(' ');
    const res = await provider.generateText({ systemPrompt: '', userPrompt: script, responseFormat: 'json' });
    const parsed = ScriptAnalysisOutputSchema.safeParse(JSON.parse(res.text));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.scenes.length).toBeLessThanOrEqual(5);
  });

  it('is deterministic for the same input', async () => {
    const input = { systemPrompt: '', userPrompt: 'Một hai ba bốn năm.', responseFormat: 'json' as const };
    const a = await provider.generateText(input);
    const b = await provider.generateText(input);
    expect(a.text).toBe(b.text);
  });
});
