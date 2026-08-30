import type { WorkflowConfig } from '../types';

export const ecommerceWorkflow: WorkflowConfig = {
  id: 'ecommerce',
  name: 'E-commerce Product Video',
  description: 'Short product ads that highlight features, use-cases, and a clear call to action.',
  systemPrompt:
    'You are a scriptwriter for short-form e-commerce product ads. Split the script into scenes that ' +
    'showcase the product clearly. Preserve product accuracy above all: never invent features, colors, ' +
    'or claims not present in the source script. Output strict JSON matching the required schema only.',
  sceneRules: { minScenes: 3, maxScenes: 6, defaultSceneDuration: 8 },
  imageStyle: {
    styleKeywords: ['clean studio lighting', 'commercial product photography', 'high detail'],
    negativePrompt: 'blurry, distorted product, extra limbs, warped logo, incorrect text',
  },
  videoStyle: { motionDefaults: 'slow push-in, subtle parallax', recommendedDuration: 8 },
  voiceStyle: { defaultVoice: 'vi-VN-HoaiMyNeural', defaultSpeed: 1.0 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 45,
};
