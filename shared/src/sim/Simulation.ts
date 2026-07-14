import { PLAYER_SIZE, SIMULATION_TICK_RATE, VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import {
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  TELEPORT_DURATION_TICKS,
} from '../constants/physics';
import { PLAYER_COLORS, type AABB, type PlayerColor } from '../types/core';
import type { CloneState, PlayerState, SimulationSnapshot } from '../types/entities';
import { EMPTY_INPUT, type PlayerInput } from '../types/input';
import type { LevelDefinition } from '../types/level';
import { aabbIntersects, moveWithCollisions } from './aabb';
import type { SimEvent } from './events';
import { playerCollidesWithClone } from './rules';

const DT = 1 / SIMULATION_TICK_RATE;

export type InputMap = Record<PlayerColor, PlayerInput>;

/** Rising-edge detection: actions fire on the tick a key goes down, not while held. */
function pressed(now: boolean, before: boolean): boolean {
  return now && !before;
}

/**
 * The deterministic fixed-timestep core of Cloner. Engine-agnostic on purpose:
 * the authoritative server runs it for online rooms and the client runs it
 * directly for Duo-on-one-PC (see Decision 1 in ARCHITECTURE.md).
 *
 * Milestone 2 scope: movement, clones, the Golden Rule, reset.
 * Milestone 4 adds buttons, doors, exits, lasers, platforms, elevators.
 */
export class Simulation {
  private readonly level: LevelDefinition;

  private tick = 0;
  private players!: Record<PlayerColor, PlayerState>;
  private clones: CloneState[] = [];
  private previousInputs!: InputMap;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.reset();
  }

  /**
   * Rebuilds the whole level state from the definition. Called on death of
   * either player — this single method IS the spec's "everything resets".
   */
  reset(): void {
    this.tick = 0;
    this.clones = [];
    this.previousInputs = {
      blue: { ...EMPTY_INPUT },
      red: { ...EMPTY_INPUT },
    };
    this.players = {
      blue: this.spawnPlayer('blue'),
      red: this.spawnPlayer('red'),
    };
  }

  private spawnPlayer(color: PlayerColor): PlayerState {
    return {
      color,
      position: { ...this.level.spawns[color] },
      velocity: { x: 0, y: 0 },
      isGrounded: false,
      isAlive: true,
      teleportTicksLeft: 0,
    };
  }

  step(inputs: InputMap): SimEvent[] {
    this.tick += 1;
    const events: SimEvent[] = [];

    for (const color of PLAYER_COLORS) {
      this.stepPlayer(color, inputs[color], this.previousInputs[color], events);
    }

    this.previousInputs = {
      blue: { ...inputs.blue },
      red: { ...inputs.red },
    };
    return events;
  }

  snapshot(): SimulationSnapshot {
    return structuredClone({
      tick: this.tick,
      players: this.players,
      clones: this.clones,
      buttons: {},
      doors: {},
      lasers: {},
      platforms: {},
    });
  }

  // -------------------------------------------------------------------------
  // Per-player tick
  // -------------------------------------------------------------------------

  private stepPlayer(
    color: PlayerColor,
    input: PlayerInput,
    prev: PlayerInput,
    events: SimEvent[],
  ): void {
    const player = this.players[color];

    if (player.teleportTicksLeft > 0) {
      player.teleportTicksLeft -= 1;
      if (player.teleportTicksLeft === 0) {
        player.position = { ...this.level.spawns[color] };
        player.velocity = { x: 0, y: 0 };
      }
      return;
    }

    if (pressed(input.placeClone, prev.placeClone) && this.canPlaceClone(color)) {
      this.placeClone(player);
      events.push({ type: 'clonePlaced', owner: color });
      return;
    }

    if (pressed(input.removeClone, prev.removeClone) && this.tryRemoveClone(player)) {
      events.push({ type: 'cloneRemoved', owner: color });
    }

    this.applyMovement(player, input, prev);
  }

  private applyMovement(player: PlayerState, input: PlayerInput, prev: PlayerInput): void {
    player.velocity.x = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * MOVE_SPEED;
    player.velocity.y = Math.min(player.velocity.y + GRAVITY * DT, MAX_FALL_SPEED);
    if (pressed(input.jump, prev.jump) && player.isGrounded) {
      player.velocity.y = JUMP_VELOCITY;
    }

    const moved = moveWithCollisions(
      this.playerBox(player),
      player.velocity.x * DT,
      player.velocity.y * DT,
      this.collidersFor(player.color),
    );
    player.position.x = moved.x;
    player.position.y = moved.y;
    if (moved.hitY) player.velocity.y = 0;
    player.isGrounded = moved.landed;

    this.clampToScreen(player);
  }

  /** Screen edges are solid — players cannot leave the screen (spec). */
  private clampToScreen(player: PlayerState): void {
    const maxX = VIEW_WIDTH - PLAYER_SIZE;
    const maxY = VIEW_HEIGHT - PLAYER_SIZE;
    if (player.position.x < 0) player.position.x = 0;
    if (player.position.x > maxX) player.position.x = maxX;
    if (player.position.y < 0) {
      player.position.y = 0;
      player.velocity.y = 0;
    }
    if (player.position.y > maxY) {
      player.position.y = maxY;
      player.velocity.y = 0;
      player.isGrounded = true;
    }
  }

  // -------------------------------------------------------------------------
  // Clones
  // -------------------------------------------------------------------------

  private canPlaceClone(color: PlayerColor): boolean {
    const owned = this.clones.filter((clone) => clone.owner === color).length;
    return owned < this.level.cloneLimitPerPlayer;
  }

  private placeClone(player: PlayerState): void {
    this.clones.push({
      owner: player.color,
      position: { ...player.position },
      rotation: 0,
      attachedPlatformId: null,
    });
    // The spec: placing a clone immediately teleports the player back to spawn.
    player.velocity = { x: 0, y: 0 };
    player.teleportTicksLeft = TELEPORT_DURATION_TICKS;
  }

  /** Removing requires physically overlapping your OWN clone's outline. */
  private tryRemoveClone(player: PlayerState): boolean {
    const box = this.playerBox(player);
    const index = this.clones.findIndex(
      (clone) => clone.owner === player.color && aabbIntersects(box, this.cloneBox(clone)),
    );
    if (index === -1) return false;
    this.clones.splice(index, 1);
    return true;
  }

  // -------------------------------------------------------------------------
  // Collision sets
  // -------------------------------------------------------------------------

  /**
   * Everything solid for this player: level geometry plus clones filtered
   * through the Golden Rule. Players never collide with each other
   * (see working assumptions in ARCHITECTURE.md).
   */
  private collidersFor(color: PlayerColor): AABB[] {
    const colliders: AABB[] = [...this.level.solids];
    for (const clone of this.clones) {
      if (playerCollidesWithClone(color, clone.owner)) {
        colliders.push(this.cloneBox(clone));
      }
    }
    return colliders;
  }

  private playerBox(player: PlayerState): AABB {
    return {
      x: player.position.x,
      y: player.position.y,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    };
  }

  private cloneBox(clone: CloneState): AABB {
    return {
      x: clone.position.x,
      y: clone.position.y,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    };
  }
}
