import { LASER_BEAM_THICKNESS } from '../constants/objects';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import type { AABB, Vec2 } from '../types/core';
import type { SimulationSnapshot } from '../types/entities';
import type { LaserDef, LevelDefinition } from '../types/level';
import { aabbIntersects } from './aabb';

/**
 * Computes the beam rectangle of a firing laser: it starts at the emitter's
 * origin and extends in the laser's direction until the first obstacle
 * (solids, closed doors, platforms, ANY clone — a clone shields both players)
 * or the screen edge.
 *
 * Shared between the simulation (kill checks) and the client (rendering) so
 * the beam the player sees is exactly the beam that kills.
 */
export function computeLaserBeam(def: LaserDef, obstacles: readonly AABB[]): AABB {
  const t = LASER_BEAM_THICKNESS;
  const o: Vec2 = def.origin;

  let beam: AABB;
  switch (def.direction) {
    case 'right':
      beam = { x: o.x, y: o.y - t / 2, width: VIEW_WIDTH - o.x, height: t };
      break;
    case 'left':
      beam = { x: 0, y: o.y - t / 2, width: o.x, height: t };
      break;
    case 'down':
      beam = { x: o.x - t / 2, y: o.y, width: t, height: VIEW_HEIGHT - o.y };
      break;
    case 'up':
      beam = { x: o.x - t / 2, y: 0, width: t, height: o.y };
      break;
  }

  for (const box of obstacles) {
    if (!aabbIntersects(beam, box)) continue;
    switch (def.direction) {
      case 'right': {
        const width = box.x - o.x;
        if (width >= 0 && width < beam.width) beam.width = width;
        break;
      }
      case 'left': {
        const start = box.x + box.width;
        if (start <= o.x && start > beam.x) {
          beam.width = o.x - start;
          beam.x = start;
        }
        break;
      }
      case 'down': {
        const height = box.y - o.y;
        if (height >= 0 && height < beam.height) beam.height = height;
        break;
      }
      case 'up': {
        const start = box.y + box.height;
        if (start <= o.y && start > beam.y) {
          beam.height = o.y - start;
          beam.y = start;
        }
        break;
      }
    }
  }

  return beam;
}

/**
 * Rebuilds the beam-obstacle set from a snapshot: level solids, closed doors,
 * platforms at their current positions and every clone. Must mirror the
 * simulation's own obstacle set so the rendered beam equals the lethal beam.
 */
export function beamObstaclesFromSnapshot(
  level: LevelDefinition,
  snapshot: SimulationSnapshot,
): AABB[] {
  const obstacles: AABB[] = [...level.solids];
  for (const object of level.objects) {
    if (object.kind === 'door' && !snapshot.doors[object.id]) {
      obstacles.push(object.bounds);
    }
    if (object.kind === 'movingPlatform' || object.kind === 'elevator') {
      const position = snapshot.platforms[object.id];
      if (position) {
        obstacles.push({ ...position, width: object.size.width, height: object.size.height });
      }
    }
  }
  for (const clone of snapshot.clones) {
    obstacles.push({
      x: clone.position.x,
      y: clone.position.y,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    });
  }
  return obstacles;
}
