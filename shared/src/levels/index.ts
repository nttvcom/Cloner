import type { LevelDefinition } from '../types/level';
import { CAMPAIGN_LEVELS } from './campaign';
import { TEST_LEVEL } from './test-level';

/** Ordered playable level set (the campaign). */
export const LEVELS: readonly LevelDefinition[] = CAMPAIGN_LEVELS;

export function getLevelById(id: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function getLevelIndex(id: string): number {
  return LEVELS.findIndex((level) => level.id === id);
}

export { CAMPAIGN_LEVELS, TEST_LEVEL };
