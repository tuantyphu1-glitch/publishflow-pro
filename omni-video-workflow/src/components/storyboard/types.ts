export interface AssetDTO {
  id: string;
  url: string;
  provider: string | null;
  model: string | null;
  durationSeconds: number | null;
}

export interface SceneDTO {
  id: string;
  index: number;
  duration: number;
  voiceover: string;
  visualDescription: string;
  imagePrompt: string;
  videoPrompt: string;
  camera: string | null;
  movement: string | null;
  status: string;
  imageAsset: AssetDTO | null;
  videoAsset: AssetDTO | null;
  audioAsset: AssetDTO | null;
}

export interface RenderDTO {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  outputUrl: string | null;
  errorText: string | null;
}

export interface ProjectDTO {
  id: string;
  name: string;
  workflowId: string;
  language: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  targetDuration: number;
  script: string;
  status: string;
  scenes: SceneDTO[];
  latestRender: RenderDTO | null;
}

export interface GenerationJobDTO {
  id: string;
  projectId: string;
  sceneId: string | null;
  type: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  progressPct: number;
}
