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
