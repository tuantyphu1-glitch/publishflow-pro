// Mirrors src/types/workflow.ts. Duplicated (rather than imported) so this folder
// can be loaded by the seed script without depending on the `@/` path alias, which
// only exists inside the src/ TypeScript project.
export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  sceneRules: { minScenes: number; maxScenes: number; defaultSceneDuration: number };
  imageStyle: { styleKeywords: string[]; negativePrompt?: string };
  videoStyle: { motionDefaults: string; recommendedDuration: number };
  voiceStyle: { defaultVoice: string; defaultSpeed: number };
  subtitleStyle: { fontFamily: string; position: 'bottom' | 'top'; burnIn: boolean };
  recommendedDuration: number;
}
