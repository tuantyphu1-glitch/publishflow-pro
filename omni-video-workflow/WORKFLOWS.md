# Workflows

A workflow is a **config, not code**: it customizes the script-analysis system
prompt, scene rules, image/video/voice style, and subtitle style. The workflow
engine itself never branches on workflow id.

## Current profiles

`ecommerce`, `fashion`, `food-review`, `storytelling`, `stickman`, `finance`,
`documentary` — one file each under `workflows/<id>/config.ts`.

## Adding a workflow

1. Create `workflows/<id>/config.ts`:
   ```ts
   import type { WorkflowConfig } from '../types';

   export const myWorkflow: WorkflowConfig = {
     id: 'my-workflow',
     name: 'My Workflow',
     description: '...',
     systemPrompt: '...',
     sceneRules: { minScenes: 3, maxScenes: 6, defaultSceneDuration: 8 },
     imageStyle: { styleKeywords: ['...'], negativePrompt: '...' },
     videoStyle: { motionDefaults: '...', recommendedDuration: 8 },
     voiceStyle: { defaultVoice: '...', defaultSpeed: 1.0 },
     subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
     recommendedDuration: 45,
   };
   ```
2. Add it to `workflows/index.ts`'s `WORKFLOW_REGISTRY`.
3. Run `npm run db:seed` to upsert it into the `Workflow` table.

No changes to the engine, API routes, or storyboard UI are required — the new
workflow immediately appears in the Create Video form's workflow dropdown and
the Workflows settings page.

## Where a workflow's config is actually used

- `systemPrompt` → `src/lib/workflow/scriptAnalysis.ts`'s LLM call.
- `imageStyle` / `videoStyle` → the (Phase 3+) prompt composer that merges
  character + product + scene + workflow style into the final image/video prompt.
- `voiceStyle` → the (Phase 5) TTS request defaults.
- `subtitleStyle` → the (Phase 6) subtitle renderer / burn-in step.
