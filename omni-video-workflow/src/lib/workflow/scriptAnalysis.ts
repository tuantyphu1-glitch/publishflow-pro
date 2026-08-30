import { ScriptAnalysisOutputSchema, type ScriptAnalysisOutput } from '@/lib/validation/schemas';
import { getLLMProvider, getLLMFallbackProvider, withFallback } from './registry';
import type { WorkflowConfig } from '@/types/workflow';

export class ScriptAnalysisError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'ScriptAnalysisError';
  }
}

function tryParseJson(text: string): unknown {
  // LLMs sometimes wrap JSON in markdown code fences despite instructions not to.
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const JSON_REPAIR_SYSTEM_PROMPT =
  'You are a strict JSON repair tool. You will be given invalid or schema-non-conforming JSON ' +
  'plus the validation errors. Return ONLY the corrected JSON object, with no markdown fences, ' +
  'no commentary, matching the required schema exactly.';

/**
 * Converts a raw script into structured scenes via the LLM, never trusting the raw
 * output: parse -> Zod validate -> on failure, one structured repair round-trip ->
 * validate again -> throw ScriptAnalysisError if still invalid (Rule: every AI
 * output must be validated; never blindly trust raw LLM JSON).
 */
export async function analyzeScript(params: {
  script: string;
  workflow: WorkflowConfig;
  projectId?: string;
}): Promise<ScriptAnalysisOutput> {
  const primary = await getLLMProvider();
  const fallback = await getLLMFallbackProvider();

  const first = await withFallback(
    {
      systemPrompt: params.workflow.systemPrompt,
      userPrompt: params.script,
      responseFormat: 'json' as const,
    },
    { id: primary.id, run: (r) => primary.generateText(r) },
    fallback ? { id: fallback.id, run: (r) => fallback.generateText(r) } : null,
    { operation: 'generateText:scriptAnalysis', projectId: params.projectId },
  );

  const parsed = tryParseJson(first.text);
  const validated = ScriptAnalysisOutputSchema.safeParse(parsed);
  if (validated.success) return validated.data;

  const repairProvider = await getLLMProvider();
  const repair = await repairProvider.generateText({
    systemPrompt: JSON_REPAIR_SYSTEM_PROMPT,
    userPrompt: `Invalid JSON:\n${first.text}\n\nValidation errors:\n${validated.error.message}\n\nReturn corrected JSON only.`,
    responseFormat: 'json',
  });
  const repaired = ScriptAnalysisOutputSchema.safeParse(tryParseJson(repair.text));
  if (repaired.success) return repaired.data;

  throw new ScriptAnalysisError('LLM output failed schema validation twice (original + one repair attempt)', {
    firstErrors: validated.error.issues,
    repairErrors: repaired.error.issues,
  });
}
