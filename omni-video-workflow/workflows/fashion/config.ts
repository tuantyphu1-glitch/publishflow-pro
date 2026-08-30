import type { WorkflowConfig } from '../types';

export const fashionWorkflow: WorkflowConfig = {
  id: 'fashion',
  name: 'Fashion Lookbook',
  description: 'Stylized outfit/apparel showcases with a consistent model and clothing details preserved.',
  systemPrompt:
    'You are a scriptwriter for fashion lookbook videos. Split the script into scenes that show the ' +
    'garment from flattering angles. Preserve character identity and clothing details (fabric, pattern, ' +
    'fit) exactly as described. Output strict JSON matching the required schema only.',
  sceneRules: { minScenes: 3, maxScenes: 6, defaultSceneDuration: 6 },
  imageStyle: {
    styleKeywords: ['editorial fashion photography', 'soft natural light', 'shallow depth of field'],
    negativePrompt: 'distorted face, extra fingers, mismatched outfit, blurry fabric texture',
  },
  videoStyle: { motionDefaults: 'gentle turn, fabric movement', recommendedDuration: 6 },
  voiceStyle: { defaultVoice: 'vi-VN-NamMinhNeural', defaultSpeed: 1.0 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 30,
};
