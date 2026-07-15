import type { AABB } from '../types/core';

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export interface MoveResult {
  x: number;
  y: number;
  hitX: boolean;
  hitY: boolean;
  /** True when the box was stopped while moving down — i.e. it is standing on something. */
  landed: boolean;
}

/**
 * Moves a box by (dx, dy) against a set of solid colliders, one axis at a time
 * (the standard platformer sweep: X first, then Y). On contact the box is
 * clamped flush against the collider's face.
 */
export function moveWithCollisions(
  box: AABB,
  dx: number,
  dy: number,
  colliders: readonly AABB[],
): MoveResult {
  // Each axis is clamped only when actually moving along it: clamping a
  // stationary axis teleported bodies that something (a moving platform)
  // had shoved into overlap, instead of letting the platform push them.
  let x = box.x + dx;
  let hitX = false;
  if (dx !== 0) {
    const horizontal: AABB = { x, y: box.y, width: box.width, height: box.height };
    for (const c of colliders) {
      if (!aabbIntersects(horizontal, c)) continue;
      hitX = true;
      x = dx > 0 ? c.x - box.width : c.x + c.width;
      horizontal.x = x;
    }
  }

  let y = box.y + dy;
  let hitY = false;
  if (dy !== 0) {
    const vertical: AABB = { x, y, width: box.width, height: box.height };
    for (const c of colliders) {
      if (!aabbIntersects(vertical, c)) continue;
      hitY = true;
      y = dy > 0 ? c.y - box.height : c.y + c.height;
      vertical.y = y;
    }
  }

  return { x, y, hitX, hitY, landed: hitY && dy > 0 };
}
