import type { WorkflowConfig } from '../types';

export const documentaryWorkflow: WorkflowConfig = {
  id: 'documentary',
  name: 'Documentary',
  description: 'Fact-driven documentary-style video with a measured, informative tone.',
  systemPrompt:
    'You are a scriptwriter for documentary-style videos. Split the script into scenes with a measured, ' +
    'factual tone -- establishing context, evidence, and conclusion. Do not embellish or dramatize facts ' +
    'beyond what the source script states. Output strict JSON matching the required schema only.',
  sceneRules: { minScenes: 4, maxScenes: 8, defaultSceneDuration: 10 },
  imageStyle: {
    styleKeywords: ['documentary photography', 'natural lighting', 'realistic detail'],
    negativePrompt: 'over-stylized, cartoonish, fantastical elements',
  },
  videoStyle: { motionDefaults: 'steady observational camera, slow drift', recommendedDuration: 10 },
  voiceStyle: { defaultVoice: 'vi-VN-NamMinhNeural', defaultSpeed: 0.95 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 90,
};
