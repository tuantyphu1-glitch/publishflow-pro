import type { WorkflowConfig } from './types';
import { ecommerceWorkflow } from './ecommerce/config';
import { fashionWorkflow } from './fashion/config';
import { foodReviewWorkflow } from './food-review/config';
import { storytellingWorkflow } from './storytelling/config';
import { stickmanWorkflow } from './stickman/config';
import { financeWorkflow } from './finance/config';
import { documentaryWorkflow } from './documentary/config';

export type { WorkflowConfig } from './types';

/**
 * Adding a workflow = adding one config file + one entry here. No changes to the
 * workflow engine, API routes, or UI are required (WORKFLOWS.md documents this).
 */
export const WORKFLOW_REGISTRY: Record<string, WorkflowConfig> = {
  [ecommerceWorkflow.id]: ecommerceWorkflow,
  [fashionWorkflow.id]: fashionWorkflow,
  [foodReviewWorkflow.id]: foodReviewWorkflow,
  [storytellingWorkflow.id]: storytellingWorkflow,
  [stickmanWorkflow.id]: stickmanWorkflow,
  [financeWorkflow.id]: financeWorkflow,
  [documentaryWorkflow.id]: documentaryWorkflow,
};
