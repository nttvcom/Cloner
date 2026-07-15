import { describe, expect, it } from 'vitest';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../constants/game';
import { PLAYER_COLORS } from '../../types/core';
import { aabbIntersects } from '../../sim/aabb';
import { CAMPAIGN_LEVELS } from '../campaign';

describe('campaign level definitions', () => {
  it('has at least one exit per level and unique object ids', () => {
    for (const level of CAMPAIGN_LEVELS) {
      const exits = level.objects.filter((o) => o.kind === 'exit');
      expect(exits.length, level.id).toBeGreaterThan(0);
      const ids = level.objects.map((o) => o.id);
      expect(new Set(ids).size, level.id).toBe(ids.length);
    }
  });

  it('every button targets an existing object', () => {
    for (const level of CAMPAIGN_LEVELS) {
      const ids = new Set(level.objects.map((o) => o.id));
      for (const object of level.objects) {
        if (object.kind !== 'button') continue;
        for (const target of object.targets) {
          expect(ids.has(target), `${level.id}: ${object.id} -> ${target}`).toBe(true);
        }
      }
    }
  });

  it('spawns are inside the screen and not inside solids or platforms', () => {
    for (const level of CAMPAIGN_LEVELS) {
      for (const color of PLAYER_COLORS) {
        const spawn = level.spawns[color];
        const box = { x: spawn.x, y: spawn.y, width: PLAYER_SIZE, height: PLAYER_SIZE };
        expect(spawn.x >= 0 && spawn.x + PLAYER_SIZE <= VIEW_WIDTH, level.id).toBe(true);
        expect(spawn.y >= 0 && spawn.y + PLAYER_SIZE <= VIEW_HEIGHT, level.id).toBe(true);
        for (const solid of level.solids) {
          expect(aabbIntersects(box, solid), `${level.id} ${color} spawn in solid`).toBe(false);
        }
        for (const object of level.objects) {
          if (object.kind === 'movingPlatform') {
            const start = object.path[0]!;
            const platform = { ...start, width: object.size.width, height: object.size.height };
            expect(aabbIntersects(box, platform), `${level.id} ${color} spawn in platform`).toBe(false);
          }
          if (object.kind === 'elevator') {
            const platform = { ...object.from, width: object.size.width, height: object.size.height };
            expect(aabbIntersects(box, platform), `${level.id} ${color} spawn in elevator`).toBe(false);
          }
        }
      }
    }
  });

  it('spawned players are not inside a firing laser beam on tick 1', async () => {
    const { Simulation } = await import('../../sim/Simulation');
    const { EMPTY_INPUT } = await import('../../types/input');
    for (const level of CAMPAIGN_LEVELS) {
      const sim = new Simulation(level);
      const events = sim.step({ blue: { ...EMPTY_INPUT }, red: { ...EMPTY_INPUT } });
      const deaths = events.filter((e) => e.type === 'playerDied');
      expect(deaths, `${level.id} kills someone at spawn`).toHaveLength(0);
    }
  });
});
