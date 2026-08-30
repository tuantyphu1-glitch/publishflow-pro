import { z } from 'zod';

// ===== Script analysis output (LLM structured output, Zod-validated, never trusted raw) =====

export const SceneSchema = z.object({
  id: z.number().int(),
  duration: z.number().int().min(1).max(30),
  voiceover: z.string().min(1),
  visualDescription: z.string().min(1),
  imagePrompt: z.string().min(1),
  videoPrompt: z.string().min(1),
  camera: z.string().optional().default(''),
  movement: z.string().optional().default(''),
  lighting: z.string().optional().default(''),
  transition: z.string().optional().default(''),
});
export type SceneOutput = z.infer<typeof SceneSchema>;

export const CharacterRefSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const ProductRefSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const ScriptAnalysisOutputSchema = z.object({
  project: z.object({
    title: z.string(),
    summary: z.string(),
    language: z.string(),
    targetDuration: z.number().int().positive(),
  }),
  characters: z.array(CharacterRefSchema).default([]),
  products: z.array(ProductRefSchema).default([]),
  scenes: z.array(SceneSchema).min(1),
});
export type ScriptAnalysisOutput = z.infer<typeof ScriptAnalysisOutputSchema>;

export const ImageValidationOutputSchema = z.object({
  score: z.number().min(0).max(100),
  approved: z.boolean(),
  issues: z.array(z.string()).default([]),
});
export type ImageValidationOutput = z.infer<typeof ImageValidationOutputSchema>;

// ===== API request bodies =====

export const AspectRatioInputSchema = z.enum(['9:16', '16:9', '1:1']);

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1, 'name is required'),
  workflowId: z.string().min(1, 'workflowId is required'),
  language: z.string().default('vi'),
  aspectRatio: AspectRatioInputSchema.default('9:16'),
  targetDuration: z.number().int().positive().default(60),
  script: z.string().min(1, 'script is required'),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateSceneRequestSchema = z.object({
  duration: z.number().int().min(1).max(30).optional(),
  voiceover: z.string().optional(),
  visualDescription: z.string().optional(),
  imagePrompt: z.string().optional(),
  videoPrompt: z.string().optional(),
  camera: z.string().optional(),
  movement: z.string().optional(),
  lighting: z.string().optional(),
  transition: z.string().optional(),
});
export type UpdateSceneRequest = z.infer<typeof UpdateSceneRequestSchema>;

export const CreateCharacterRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
});

export const CreateProductRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  color: z.string().optional(),
  material: z.string().optional(),
  shape: z.string().optional(),
  visibleDetails: z.string().optional(),
});

export const UpdateProviderConfigRequestSchema = z.object({
  capability: z.enum(['LLM', 'IMAGE', 'VIDEO', 'TTS']),
  providerId: z.string().min(1),
  isPrimary: z.boolean().optional(),
  isFallback: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/** Maps the wire-format aspect ratio ("9:16") to the Prisma enum value (R9_16). */
export function aspectRatioToEnum(v: z.infer<typeof AspectRatioInputSchema>): 'R9_16' | 'R16_9' | 'R1_1' {
  return v === '9:16' ? 'R9_16' : v === '16:9' ? 'R16_9' : 'R1_1';
}
export function aspectRatioFromEnum(v: 'R9_16' | 'R16_9' | 'R1_1'): '9:16' | '16:9' | '1:1' {
  return v === 'R9_16' ? '9:16' : v === 'R16_9' ? '16:9' : '1:1';
}
