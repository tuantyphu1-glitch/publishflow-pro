import type { WorkflowConfig } from '../types';

export const financeWorkflow: WorkflowConfig = {
  id: 'finance',
  name: 'Personal Finance Explainer',
  description: 'Personal-finance / behavioral-economics explainer videos with data-backed claims.',
  systemPrompt:
    'You are a scriptwriter for personal finance explainer videos. Split the script into scenes that ' +
    'build a clear argument: hook, problem, insight, actionable takeaway. Do not fabricate statistics ' +
    'not present in the source script. Output strict JSON matching the required schema only.',
  sceneRules: { minScenes: 3, maxScenes: 6, defaultSceneDuration: 9 },
  imageStyle: {
    styleKeywords: ['clean infographic style', 'modern flat illustration', 'high contrast typography'],
    negativePrompt: 'cluttered composition, unreadable text, distorted charts',
  },
  videoStyle: { motionDefaults: 'subtle infographic motion, animated data reveal', recommendedDuration: 9 },
  voiceStyle: { defaultVoice: 'vi-VN-NamMinhNeural', defaultSpeed: 1.0 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 50,
};
