import { describe, it, expect } from 'vitest';
import { ScriptAnalysisOutputSchema, CreateProjectRequestSchema, aspectRatioToEnum, aspectRatioFromEnum } from '@/lib/validation/schemas';

describe('ScriptAnalysisOutputSchema', () => {
  it('accepts a well-formed script analysis payload', () => {
    const result = ScriptAnalysisOutputSchema.safeParse({
      project: { title: 'T', summary: 'S', language: 'vi', targetDuration: 30 },
      characters: [],
      products: [],
      scenes: [
        {
          id: 1,
          duration: 8,
          voiceover: 'hello',
          visualDescription: 'a scene',
          imagePrompt: 'a prompt',
          videoPrompt: 'motion',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing required scene fields', () => {
    const result = ScriptAnalysisOutputSchema.safeParse({
      project: { title: 'T', summary: 'S', language: 'vi', targetDuration: 30 },
      scenes: [{ id: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a payload with zero scenes', () => {
    const result = ScriptAnalysisOutputSchema.safeParse({
      project: { title: 'T', summary: 'S', language: 'vi', targetDuration: 30 },
      scenes: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateProjectRequestSchema', () => {
  it('applies defaults for optional fields', () => {
    const result = CreateProjectRequestSchema.parse({ name: 'X', workflowId: 'ecommerce', script: 'Hello world.' });
    expect(result.language).toBe('vi');
    expect(result.aspectRatio).toBe('9:16');
    expect(result.targetDuration).toBe(60);
  });

  it('rejects an empty script', () => {
    const result = CreateProjectRequestSchema.safeParse({ name: 'X', workflowId: 'ecommerce', script: '' });
    expect(result.success).toBe(false);
  });
});

describe('aspect ratio enum mapping round-trips', () => {
  it.each([
    ['9:16', 'R9_16'],
    ['16:9', 'R16_9'],
    ['1:1', 'R1_1'],
  ] as const)('%s <-> %s', (wire, enumValue) => {
    expect(aspectRatioToEnum(wire)).toBe(enumValue);
    expect(aspectRatioFromEnum(enumValue)).toBe(wire);
  });
});
