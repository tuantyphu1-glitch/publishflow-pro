import type { WorkflowConfig } from '../types';

export const stickmanWorkflow: WorkflowConfig = {
  id: 'stickman',
  name: 'Stickman Animation',
  description: 'Simple, high-contrast stickman-style explainer/story animation.',
  systemPrompt:
    'You are a scriptwriter for stickman-style animated explainer videos. Split the script into scenes ' +
    'with simple, clearly staged actions suitable for minimalist line-art animation. Output strict JSON ' +
    'matching the required schema only.',
  sceneRules: { minScenes: 3, maxScenes: 7, defaultSceneDuration: 6 },
  imageStyle: {
    styleKeywords: ['minimalist stickman line art', 'flat white background', 'high contrast black lines'],
    negativePrompt: 'realistic rendering, color photo, complex background, extra limbs',
  },
  videoStyle: { motionDefaults: 'simple 2D-style motion, clear single action per scene', recommendedDuration: 6 },
  voiceStyle: { defaultVoice: 'vi-VN-NamMinhNeural', defaultSpeed: 1.0 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 40,
};
