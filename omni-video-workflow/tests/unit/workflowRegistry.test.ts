import { describe, it, expect } from 'vitest';
import { WORKFLOW_REGISTRY } from '../../workflows';

describe('WORKFLOW_REGISTRY', () => {
  it('seeds exactly the 7 spec-required profiles', () => {
    const ids = Object.keys(WORKFLOW_REGISTRY).sort();
    expect(ids).toEqual(['documentary', 'ecommerce', 'fashion', 'finance', 'food-review', 'stickman', 'storytelling']);
  });

  it('every workflow config is internally consistent', () => {
    for (const workflow of Object.values(WORKFLOW_REGISTRY)) {
      expect(workflow.sceneRules.minScenes).toBeLessThanOrEqual(workflow.sceneRules.maxScenes);
      expect(workflow.systemPrompt.length).toBeGreaterThan(20);
      expect(workflow.id.length).toBeGreaterThan(0);
    }
  });
});
