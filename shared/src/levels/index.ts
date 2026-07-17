import type { LevelDefinition } from '../types/level';
import { CAMPAIGN_LEVELS } from './campaign';
import { SOLO_LEVELS } from './solo';
import { TEST_LEVEL } from './test-level';

/** Ordered co-op level set (the campaign). */
export const LEVELS: readonly LevelDefinition[] = CAMPAIGN_LEVELS;

export function getLevelById(id: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id) ?? SOLO_LEVELS.find((level) => level.id === id);
}

export function getLevelIndex(id: string): number {
  return LEVELS.findIndex((level) => level.id === id);
}

export function getSoloLevelIndex(id: string): number {
  return SOLO_LEVELS.findIndex((level) => level.id === id);
}

export { CAMPAIGN_LEVELS, SOLO_LEVELS, TEST_LEVEL };
