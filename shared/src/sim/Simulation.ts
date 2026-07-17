import { PLAYER_SIZE, SIMULATION_TICK_RATE, VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import { BUTTON_HEIGHT, BUTTON_WIDTH } from '../constants/objects';
import {
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  TELEPORT_DURATION_TICKS,
} from '../constants/physics';
import { PLAYER_COLORS, type AABB, type ObjectId, type PlayerColor, type Vec2 } from '../types/core';
import type { CloneState, PlayerState, SimulationSnapshot } from '../types/entities';
import { EMPTY_INPUT, type PlayerInput } from '../types/input';
import type {
  ButtonDef,
  DoorDef,
  ElevatorDef,
  ExitDef,
  LaserDef,
  LevelDefinition,
  MovingPlatformDef,
} from '../types/level';
import { aabbIntersects, moveWithCollisions } from './aabb';
import type { SimEvent } from './events';
import { computeLaserBeam } from './laser';
import { playerCollidesWithClone } from './rules';

const DT = 1 / SIMULATION_TICK_RATE;

export type InputMap = Record<PlayerColor, PlayerInput>;

/** Rising-edge detection: actions fire on the tick a key goes down, not while held. */
function pressed(now: boolean, before: boolean): boolean {
  return now && !before;
}

/** Pause at each end of a powered elevator's run — riders board/leave calmly. */
const ELEVATOR_DWELL_TICKS = 102; // ~1.7s

interface PlatformRuntime {
  def: MovingPlatformDef | ElevatorDef;
  position: Vec2;
  /**
   * Moving platform: distance traveled along the looped path.
   * Elevator: distance from `from` toward `to` (0..segment length).
   */
  progress: number;
  /** For moving platforms: index of the path segment currently being walked. */
  segment: number;
  /** Elevator shuttle direction: 1 = toward `to`, -1 = toward `from`. */
  direction: 1 | -1;
  /** Elevator: remaining pause ticks at an endpoint. */
  dwellTicks: number;
}

/**
 * The deterministic fixed-timestep core of Cloner. Engine-agnostic on purpose:
 * the authoritative server runs it for online rooms and the client runs it
 * directly for Duo-on-one-PC (see Decision 1 in ARCHITECTURE.md).
 */
export class Simulation {
  private readonly level: LevelDefinition;
  /** Single-player: only blue plays and it collides with its own clones. */
  private readonly solo: boolean;
  /** Colours the step loop actually simulates (just blue in solo). */
  private readonly activeColors: PlayerColor[];

  private readonly buttonDefs: ButtonDef[] = [];
  private readonly doorDefs: DoorDef[] = [];
  private readonly exitDefs: ExitDef[] = [];
  private readonly laserDefs: LaserDef[] = [];
  private readonly platformDefs: (MovingPlatformDef | ElevatorDef)[] = [];

  private tick = 0;
  private players!: Record<PlayerColor, PlayerState>;
  private clones: CloneState[] = [];
  private previousInputs!: InputMap;

  private buttonsPressed: Record<ObjectId, boolean> = {};
  private doorsOpen: Record<ObjectId, boolean> = {};
  private lasersFiring: Record<ObjectId, boolean> = {};
  private platforms: Record<ObjectId, PlatformRuntime> = {};
  private completed = false;

  // Debug-only state (never set by the server; local dev tooling).
  private readonly noclip = new Set<PlayerColor>();
  private unlimitedClones = false;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.solo = level.solo === true;
    this.activeColors = this.solo ? ['blue'] : [...PLAYER_COLORS];
    for (const object of level.objects) {
      switch (object.kind) {
        case 'button':
          this.buttonDefs.push(object);
          break;
        case 'door':
          this.doorDefs.push(object);
          break;
        case 'exit':
          this.exitDefs.push(object);
          break;
        case 'laser':
          this.laserDefs.push(object);
          break;
        case 'movingPlatform':
        case 'elevator':
          this.platformDefs.push(object);
          break;
      }
    }
    this.reset();
  }

  get isCompleted(): boolean {
    return this.completed;
  }

  get levelDefinition(): LevelDefinition {
    return this.level;
  }

  /**
   * Rebuilds the whole level state from the definition. Called on death of
   * either player — this single method IS the spec's "everything resets".
   */
  reset(): void {
    this.tick = 0;
    this.clones = [];
    this.completed = false;
    this.previousInputs = {
      blue: { ...EMPTY_INPUT },
      red: { ...EMPTY_INPUT },
    };
    this.players = {
      blue: this.spawnPlayer('blue'),
      red: this.spawnPlayer('red'),
    };
    // In solo the red cube does not exist: mark it absent so it never presses
    // buttons, trips exits, dies, or renders as a live player.
    if (this.solo) this.players.red.isAlive = false;
    this.buttonsPressed = {};
    for (const button of this.buttonDefs) this.buttonsPressed[button.id] = false;
    this.doorsOpen = {};
    for (const door of this.doorDefs) this.doorsOpen[door.id] = door.openByDefault ?? false;
    this.lasersFiring = {};
    for (const laser of this.laserDefs) this.lasersFiring[laser.id] = true;
    this.platforms = {};
    for (const def of this.platformDefs) {
      const start = def.kind === 'movingPlatform' ? def.path[0] : def.from;
      this.platforms[def.id] = {
        def,
        position: { x: start?.x ?? 0, y: start?.y ?? 0 },
        progress: 0,
        segment: 0,
        direction: 1,
        dwellTicks: 0,
      };
    }
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
    if (this.completed) return [];
    this.tick += 1;
    const events: SimEvent[] = [];

    this.updateButtons();
    this.updateDoors();
    this.updateLasers();
    this.updatePlatforms();

    for (const color of this.activeColors) {
      this.stepPlayer(color, inputs[color], this.previousInputs[color], events);
    }

    this.previousInputs = {
      blue: { ...inputs.blue },
      red: { ...inputs.red },
    };

    if (this.checkLaserDeaths(events)) {
      return events;
    }
    this.checkExits(events);
    return events;
  }

  /**
   * Hand-rolled deep copy: this runs every render frame on the client and
   * 20x/s on the server, and structuredClone here was one of the largest
   * frame-time costs in profiling.
   */
  snapshot(): SimulationSnapshot {
    const platforms: Record<ObjectId, Vec2> = {};
    for (const [id, runtime] of Object.entries(this.platforms)) {
      platforms[id] = { x: runtime.position.x, y: runtime.position.y };
    }
    const copyPlayer = (p: PlayerState): PlayerState => ({
      color: p.color,
      position: { x: p.position.x, y: p.position.y },
      velocity: { x: p.velocity.x, y: p.velocity.y },
      isGrounded: p.isGrounded,
      isAlive: p.isAlive,
      teleportTicksLeft: p.teleportTicksLeft,
    });
    return {
      tick: this.tick,
      players: { blue: copyPlayer(this.players.blue), red: copyPlayer(this.players.red) },
      clones: this.clones.map((c) => ({
        owner: c.owner,
        position: { x: c.position.x, y: c.position.y },
        rotation: c.rotation,
        attachedPlatformId: c.attachedPlatformId,
      })),
      buttons: { ...this.buttonsPressed },
      doors: { ...this.doorsOpen },
      lasers: { ...this.lasersFiring },
      platforms,
    };
  }

  // -------------------------------------------------------------------------
  // Buttons / doors / lasers
  // -------------------------------------------------------------------------

  private buttonBox(def: ButtonDef): AABB {
    return { x: def.position.x, y: def.position.y, width: BUTTON_WIDTH, height: BUTTON_HEIGHT };
  }

  /**
   * Buttons are pure weight sensors: any present player and ANY clone —
   * including the owner's — presses them (designer ruling: buttons are
   * held-only pressure plates, no toggles).
   */
  private updateButtons(): void {
    for (const def of this.buttonDefs) {
      const box = this.buttonBox(def);
      let active = false;
      for (const color of PLAYER_COLORS) {
        const player = this.players[color];
        if (this.playerIsPresent(player) && aabbIntersects(this.playerBox(player), box)) {
          active = true;
          break;
        }
      }
      if (!active) {
        active = this.clones.some((clone) => aabbIntersects(this.cloneBox(clone), box));
      }
      this.buttonsPressed[def.id] = active;
    }
  }

  private hasWiring(id: ObjectId): boolean {
    return this.buttonDefs.some((button) => button.targets.includes(id));
  }

  /**
   * "Powered" for doors/platforms/elevators: an object with no button wired
   * to it is permanently powered (runs on its own). Lasers invert this — see
   * updateLasers.
   */
  private isPowered(id: ObjectId): boolean {
    if (!this.hasWiring(id)) return true;
    return this.buttonDefs.some(
      (button) => button.targets.includes(id) && this.buttonsPressed[button.id],
    );
  }

  private updateDoors(): void {
    for (const def of this.doorDefs) {
      const powered = this.isPowered(def.id);
      const wantsOpen = def.openByDefault ? !powered : powered;
      if (wantsOpen) {
        this.doorsOpen[def.id] = true;
        continue;
      }
      // A door never crushes: it stays open while anything stands in it.
      const blocked =
        PLAYER_COLORS.some((color) => {
          const player = this.players[color];
          return this.playerIsPresent(player) && aabbIntersects(this.playerBox(player), def.bounds);
        }) || this.clones.some((clone) => aabbIntersects(this.cloneBox(clone), def.bounds));
      this.doorsOpen[def.id] = blocked;
    }
  }

  private updateLasers(): void {
    for (const def of this.laserDefs) {
      // Lasers fire by default; a pressed button wired to one shuts it off.
      const suppressed =
        this.hasWiring(def.id) &&
        this.buttonDefs.some(
          (button) => button.targets.includes(def.id) && this.buttonsPressed[button.id],
        );
      this.lasersFiring[def.id] = !suppressed;
    }
  }

  // -------------------------------------------------------------------------
  // Moving platforms & elevators
  // -------------------------------------------------------------------------

  private updatePlatforms(): void {
    for (const runtime of Object.values(this.platforms)) {
      const before = { ...runtime.position };
      const riders = this.detectRiders(runtime);

      const target = this.nextPlatformPosition(runtime);
      const delta = { x: target.x - before.x, y: target.y - before.y };
      if (delta.x === 0 && delta.y === 0) continue;

      // Clones are dead weight: a platform moving into a clone that is NOT
      // riding it stalls (lets players jam elevators on purpose).
      const candidate: AABB = {
        x: target.x,
        y: target.y,
        width: runtime.def.size.width,
        height: runtime.def.size.height,
      };
      const jammed = this.clones.some(
        (clone) => !riders.clones.includes(clone) && aabbIntersects(candidate, this.cloneBox(clone)),
      );
      if (jammed) {
        runtime.progress = riders.savedProgress;
        runtime.segment = riders.savedSegment;
        continue;
      }

      // Players in the way are pushed along; if a push would squeeze someone
      // into a wall or off-screen, the platform stalls instead of crushing.
      const pushes: { player: PlayerState; to: Vec2 }[] = [];
      let blocked = false;
      for (const color of PLAYER_COLORS) {
        const player = this.players[color];
        if (!this.playerIsPresent(player) || riders.players.includes(player)) continue;
        if (!aabbIntersects(candidate, this.playerBox(player))) continue;
        const to = { x: player.position.x + delta.x, y: player.position.y + delta.y };
        const pushedBox: AABB = { x: to.x, y: to.y, width: PLAYER_SIZE, height: PLAYER_SIZE };
        const squeezed =
          to.x < 0 ||
          to.y < 0 ||
          to.x + PLAYER_SIZE > VIEW_WIDTH ||
          to.y + PLAYER_SIZE > VIEW_HEIGHT ||
          this.level.solids.some((solid) => aabbIntersects(pushedBox, solid)) ||
          this.doorDefs.some((door) => !this.doorsOpen[door.id] && aabbIntersects(pushedBox, door.bounds));
        if (squeezed) {
          blocked = true;
          break;
        }
        pushes.push({ player, to });
      }
      if (blocked) {
        runtime.progress = riders.savedProgress;
        runtime.segment = riders.savedSegment;
        continue;
      }

      runtime.position = target;
      for (const clone of riders.clones) {
        clone.position.x += delta.x;
        clone.position.y += delta.y;
        clone.attachedPlatformId = runtime.def.id;
      }
      for (const player of riders.players) {
        player.position.x += delta.x;
        player.position.y += delta.y;
      }
      for (const push of pushes) {
        push.player.position.x = push.to.x;
        push.player.position.y = push.to.y;
      }
    }
  }

  /** Standing on top: feet flush with the platform's surface (small tolerance). */
  private standsOn(position: Vec2, runtime: PlatformRuntime): boolean {
    const feetY = position.y + PLAYER_SIZE;
    const overlapX =
      position.x < runtime.position.x + runtime.def.size.width &&
      position.x + PLAYER_SIZE > runtime.position.x;
    return overlapX && Math.abs(feetY - runtime.position.y) <= 1;
  }

  private detectRiders(runtime: PlatformRuntime): {
    players: PlayerState[];
    clones: CloneState[];
    savedProgress: number;
    savedSegment: number;
  } {
    const players: PlayerState[] = [];
    for (const color of PLAYER_COLORS) {
      const player = this.players[color];
      if (!this.playerIsPresent(player)) continue;
      if (this.standsOn(player.position, runtime)) players.push(player);
    }
    const clones = this.clones.filter((clone) => this.standsOn(clone.position, runtime));
    for (const clone of this.clones) {
      if (!clones.includes(clone) && clone.attachedPlatformId === runtime.def.id) {
        clone.attachedPlatformId = null;
      }
    }
    return { players, clones, savedProgress: runtime.progress, savedSegment: runtime.segment };
  }

  private nextPlatformPosition(runtime: PlatformRuntime): Vec2 {
    const def = runtime.def;
    if (def.kind === 'elevator') {
      const dx = def.to.x - def.from.x;
      const dy = def.to.y - def.from.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) return { ...runtime.position };
      if (this.isPowered(def.id)) {
        // Powered elevators SHUTTLE between the ends (with a dwell pause at
        // each) instead of parking at the top — a one-shot ride made levels
        // where the power clone lands before boarding nearly impossible.
        if (runtime.dwellTicks > 0) {
          runtime.dwellTicks -= 1;
          return { ...runtime.position };
        }
        runtime.progress += runtime.direction * def.speed * DT;
        if (runtime.progress >= length) {
          runtime.progress = length;
          runtime.direction = -1;
          runtime.dwellTicks = ELEVATOR_DWELL_TICKS;
        } else if (runtime.progress <= 0) {
          runtime.progress = 0;
          runtime.direction = 1;
          runtime.dwellTicks = ELEVATOR_DWELL_TICKS;
        }
      } else {
        // Unpowered: glide home and wait, ready to head up again.
        runtime.direction = 1;
        runtime.dwellTicks = 0;
        runtime.progress = Math.max(0, runtime.progress - def.speed * DT);
      }
      const t = runtime.progress / length;
      return { x: def.from.x + dx * t, y: def.from.y + dy * t };
    }

    // Moving platform: walk the looped waypoint path.
    if (!this.isPowered(def.id) || def.path.length < 2) return { ...runtime.position };
    let remaining = def.speed * DT;
    let segment = runtime.segment;
    let progress = runtime.progress;
    for (let guard = 0; guard < def.path.length * 2 && remaining > 0; guard += 1) {
      const a = def.path[segment]!;
      const b = def.path[(segment + 1) % def.path.length]!;
      const segLength = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLength - progress > remaining) {
        progress += remaining;
        remaining = 0;
      } else {
        remaining -= segLength - progress;
        progress = 0;
        segment = (segment + 1) % def.path.length;
      }
    }
    runtime.segment = segment;
    runtime.progress = progress;
    const a = def.path[segment]!;
    const b = def.path[(segment + 1) % def.path.length]!;
    const segLength = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = progress / segLength;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  // -------------------------------------------------------------------------
  // Lasers: kill check
  // -------------------------------------------------------------------------

  /** Everything that stops a beam: level geometry, closed doors, platforms, ANY clone. */
  private beamObstacles(): AABB[] {
    const obstacles: AABB[] = [...this.level.solids];
    for (const def of this.doorDefs) {
      if (!this.doorsOpen[def.id]) obstacles.push(def.bounds);
    }
    for (const runtime of Object.values(this.platforms)) {
      obstacles.push(this.platformBox(runtime));
    }
    for (const clone of this.clones) {
      obstacles.push(this.cloneBox(clone));
    }
    return obstacles;
  }

  /** Returns true when someone died (the level was fully reset). */
  private checkLaserDeaths(events: SimEvent[]): boolean {
    const firing = this.laserDefs.filter((def) => this.lasersFiring[def.id]);
    if (firing.length === 0) return false;
    const obstacles = this.beamObstacles();
    for (const def of firing) {
      const beam = computeLaserBeam(def, obstacles);
      for (const color of PLAYER_COLORS) {
        const player = this.players[color];
        if (!this.playerIsPresent(player) || this.noclip.has(color)) continue;
        if (aabbIntersects(this.playerBox(player), beam)) {
          events.push({ type: 'playerDied', color });
          events.push({ type: 'levelReset' });
          this.reset();
          return true;
        }
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Exits
  // -------------------------------------------------------------------------

  /**
   * The level completes when EVERY exit is satisfied on the same tick:
   * blue/red exits need their player inside, gray needs either one,
   * double needs both players inside at once.
   */
  private checkExits(events: SimEvent[]): void {
    if (this.exitDefs.length === 0) return;
    const inside = (color: PlayerColor, bounds: AABB): boolean => {
      const player = this.players[color];
      return this.playerIsPresent(player) && aabbIntersects(this.playerBox(player), bounds);
    };
    const allSatisfied = this.exitDefs.every((exit) => {
      switch (exit.color) {
        case 'blue':
          return inside('blue', exit.bounds);
        case 'red':
          return inside('red', exit.bounds);
        case 'gray':
          return inside('blue', exit.bounds) || inside('red', exit.bounds);
        case 'double':
          return inside('blue', exit.bounds) && inside('red', exit.bounds);
      }
    });
    if (allSatisfied) {
      this.completed = true;
      events.push({ type: 'levelComplete' });
    }
  }

  // -------------------------------------------------------------------------
  // Per-player tick
  // -------------------------------------------------------------------------

  /** A player presses buttons / trips exits / dies only while actually in play. */
  private playerIsPresent(player: PlayerState): boolean {
    return player.isAlive && player.teleportTicksLeft === 0;
  }

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

    if (this.noclip.has(color)) {
      this.applyNoclipMovement(player, input);
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

  /** Debug noclip: free flight, no gravity, no collisions, no death. */
  private applyNoclipMovement(player: PlayerState, input: PlayerInput): void {
    const speed = MOVE_SPEED * 1.5;
    player.velocity.x = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * speed;
    player.velocity.y = ((input.down ? 1 : 0) - (input.jump ? 1 : 0)) * speed;
    player.position.x += player.velocity.x * DT;
    player.position.y += player.velocity.y * DT;
    player.isGrounded = false;
    this.clampToScreen(player);
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
    if (this.unlimitedClones) return true;
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

  /**
   * Removing requires touching your OWN clone. The player box is inflated a
   * few pixels so it works in solo too, where the clone is SOLID and the cube
   * merely rests flush against it (a strict overlap would never register).
   */
  private tryRemoveClone(player: PlayerState): boolean {
    const b = this.playerBox(player);
    const reach: AABB = { x: b.x - 3, y: b.y - 3, width: b.width + 6, height: b.height + 6 };
    const index = this.clones.findIndex(
      (clone) => clone.owner === player.color && aabbIntersects(reach, this.cloneBox(clone)),
    );
    if (index === -1) return false;
    this.clones.splice(index, 1);
    return true;
  }

  // -------------------------------------------------------------------------
  // Collision sets
  // -------------------------------------------------------------------------

  /**
   * Everything solid for this player: level geometry, closed doors, platforms,
   * plus clones filtered through the Golden Rule. Players never collide with
   * each other (see working assumptions in ARCHITECTURE.md).
   */
  private collidersFor(color: PlayerColor): AABB[] {
    const colliders: AABB[] = [...this.level.solids];
    for (const def of this.doorDefs) {
      if (!this.doorsOpen[def.id]) colliders.push(def.bounds);
    }
    for (const runtime of Object.values(this.platforms)) {
      colliders.push(this.platformBox(runtime));
    }
    for (const clone of this.clones) {
      if (playerCollidesWithClone(color, clone.owner, this.solo)) {
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

  private platformBox(runtime: PlatformRuntime): AABB {
    return {
      x: runtime.position.x,
      y: runtime.position.y,
      width: runtime.def.size.width,
      height: runtime.def.size.height,
    };
  }

  // -------------------------------------------------------------------------
  // Debug hooks — used only by the hidden client dev panel, never the server.
  // -------------------------------------------------------------------------

  debugSetNoclip(color: PlayerColor, on: boolean): void {
    if (on) this.noclip.add(color);
    else this.noclip.delete(color);
  }

  debugIsNoclip(color: PlayerColor): boolean {
    return this.noclip.has(color);
  }

  debugTeleport(color: PlayerColor, x: number, y: number): void {
    const player = this.players[color];
    player.position.x = Math.max(0, Math.min(VIEW_WIDTH - PLAYER_SIZE, x - PLAYER_SIZE / 2));
    player.position.y = Math.max(0, Math.min(VIEW_HEIGHT - PLAYER_SIZE, y - PLAYER_SIZE / 2));
    player.velocity = { x: 0, y: 0 };
    player.teleportTicksLeft = 0;
  }

  debugClearClones(): void {
    this.clones = [];
  }

  debugSetUnlimitedClones(on: boolean): void {
    this.unlimitedClones = on;
  }

  debugUnlimitedClonesOn(): boolean {
    return this.unlimitedClones;
  }
}
