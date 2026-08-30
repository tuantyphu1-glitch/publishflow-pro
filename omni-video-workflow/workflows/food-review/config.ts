import type { WorkflowConfig } from '../types';

export const foodReviewWorkflow: WorkflowConfig = {
  id: 'food-review',
  name: 'Food Review',
  description: 'Appetizing food/restaurant review scenes with close-up texture shots.',
  systemPrompt:
    'You are a scriptwriter for food review short-form videos. Split the script into scenes that build ' +
    'appetite appeal: establishing shot, close-up texture/steam shots, tasting reaction, verdict. Output ' +
    'strict JSON matching the required schema only.',
  sceneRules: { minScenes: 3, maxScenes: 5, defaultSceneDuration: 7 },
  imageStyle: {
    styleKeywords: ['warm appetizing lighting', 'macro food photography', 'steam and texture detail'],
    negativePrompt: 'unappetizing color cast, blurry food texture, wrong dish',
  },
  videoStyle: { motionDefaults: 'slow rotate around dish, steady handheld', recommendedDuration: 7 },
  voiceStyle: { defaultVoice: 'vi-VN-HoaiMyNeural', defaultSpeed: 1.05 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 35,
};
