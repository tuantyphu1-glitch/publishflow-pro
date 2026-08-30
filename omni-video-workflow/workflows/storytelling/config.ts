import type { WorkflowConfig } from '../types';

export const storytellingWorkflow: WorkflowConfig = {
  id: 'storytelling',
  name: 'Narrative Storytelling',
  description: 'Character-driven narrative videos with strong beginning/conflict/resolution structure.',
  systemPrompt:
    'You are a scriptwriter for narrative storytelling videos. Split the script into scenes following a ' +
    'clear story arc (setup, rising action, climax, resolution). Maintain consistent character identity ' +
    'and setting across all scenes. Output strict JSON matching the required schema only.',
  sceneRules: { minScenes: 4, maxScenes: 8, defaultSceneDuration: 10 },
  imageStyle: {
    styleKeywords: ['cinematic lighting', 'consistent character design', 'film still composition'],
    negativePrompt: 'character inconsistency, extra limbs, distorted face, anachronistic props',
  },
  videoStyle: { motionDefaults: 'motivated camera movement matching the emotional beat', recommendedDuration: 10 },
  voiceStyle: { defaultVoice: 'vi-VN-NamMinhNeural', defaultSpeed: 0.95 },
  subtitleStyle: { fontFamily: 'Inter', position: 'bottom', burnIn: true },
  recommendedDuration: 60,
};
