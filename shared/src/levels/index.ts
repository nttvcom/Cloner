import type { LevelDefinition } from '../types/level';
import { TEST_LEVEL } from './test-level';

/** Ordered level set. Milestone 7 replaces the sandbox with the real curve. */
export const LEVELS: readonly LevelDefinition[] = [TEST_LEVEL];

export function getLevelById(id: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}

export { TEST_LEVEL };
