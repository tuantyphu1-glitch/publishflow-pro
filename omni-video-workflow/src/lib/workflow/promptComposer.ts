import type { WorkflowConfig } from '@/types/workflow';
import type { ImageReferenceInput } from '@/providers/image/types';

/**
 * Merges scene + workflow style into the final image prompt. Reference images are
 * passed alongside (not concatenated into the text prompt) so the image provider
 * can use them as real conditioning input rather than just a text description --
 * this is the mechanism Section 11/12 relies on to preserve product/character
 * identity, not a guarantee of perfect consistency.
 */
export function composeImagePrompt(params: { scenePrompt: string; workflow: WorkflowConfig; hasReferences: boolean }): {
  prompt: string;
  negativePrompt?: string;
} {
  const styleSuffix = params.workflow.imageStyle.styleKeywords.join(', ');
  const referenceInstruction = params.hasReferences
    ? ' Preserve the exact shape, color, proportions, logos, and visible text of every reference image provided; do not alter the subject.'
    : '';
  return {
    prompt: `${params.scenePrompt}. Style: ${styleSuffix}.${referenceInstruction}`,
    negativePrompt: params.workflow.imageStyle.negativePrompt,
  };
}

export function composeVideoMotionPrompt(params: { videoPrompt: string; camera?: string | null; movement?: string | null; workflow: WorkflowConfig }): string {
  const parts = [params.videoPrompt];
  if (params.movement) parts.push(`Camera movement: ${params.movement}.`);
  else parts.push(`Camera movement: ${params.workflow.videoStyle.motionDefaults}.`);
  if (params.camera) parts.push(`Shot: ${params.camera}.`);
  return parts.join(' ');
}

export async function collectReferenceImages(params: {
  characters: { referenceImages: { id: string; url: string }[] }[];
  products: { referenceImages: { id: string; url: string }[] }[];
}): Promise<ImageReferenceInput[]> {
  const refs: ImageReferenceInput[] = [];
  for (const c of params.characters) {
    for (const img of c.referenceImages) refs.push({ url: img.url, role: 'character' });
  }
  for (const p of params.products) {
    for (const img of p.referenceImages) refs.push({ url: img.url, role: 'product' });
  }
  return refs;
}
