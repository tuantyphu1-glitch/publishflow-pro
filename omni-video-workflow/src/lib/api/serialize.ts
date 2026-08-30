import type { Project } from '@prisma/client';
import { aspectRatioFromEnum } from '@/lib/validation/schemas';

/** Converts a Prisma Project row into the wire-format shape (enum -> "9:16" style string). */
export function serializeProject(project: Project) {
  return {
    ...project,
    aspectRatio: aspectRatioFromEnum(project.aspectRatio),
  };
}

const RESOLUTION_BY_ASPECT: Record<'9:16' | '16:9' | '1:1', string> = {
  '9:16': '1080x1920',
  '16:9': '1920x1080',
  '1:1': '1080x1080',
};

export function defaultResolutionFor(aspectRatio: '9:16' | '16:9' | '1:1'): string {
  return RESOLUTION_BY_ASPECT[aspectRatio];
}
