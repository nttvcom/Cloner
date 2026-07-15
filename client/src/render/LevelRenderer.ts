import Phaser from 'phaser';
import {
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  LASER_EMITTER_SIZE,
  PLAYER_SIZE,
  beamObstaclesFromSnapshot,
  computeLaserBeam,
  type LevelDefinition,
  type SimulationSnapshot,
} from '@cloner/shared';
import { CLONE_TINTS, EXIT_TINTS, PLAYER_TINTS, WORLD } from '../colors';

/**
 * Draws a level: static geometry once, dynamic state (players, clones,
 * doors, beams, platforms) redrawn from each snapshot. Pure presentation —
 * the snapshot is the single source of truth.
 */
export class LevelRenderer {
  private readonly level: LevelDefinition;
  private readonly staticLayer: Phaser.GameObjects.Graphics;
  private readonly dynamicLayer: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, level: LevelDefinition) {
    this.level = level;
    this.staticLayer = scene.add.graphics();
    this.dynamicLayer = scene.add.graphics();
    this.drawStatic();
  }

  destroy(): void {
    this.staticLayer.destroy();
    this.dynamicLayer.destroy();
  }

  private drawStatic(): void {
    const g = this.staticLayer;
    for (const solid of this.level.solids) {
      g.fillStyle(WORLD.solid);
      g.fillRect(solid.x, solid.y, solid.width, solid.height);
      g.lineStyle(2, WORLD.solidEdge);
      g.strokeRect(solid.x + 1, solid.y + 1, solid.width - 2, solid.height - 2);
    }
    for (const object of this.level.objects) {
      if (object.kind === 'exit') {
        const b = object.bounds;
        const tint = EXIT_TINTS[object.color];
        g.lineStyle(3, tint, 1);
        g.strokeRect(b.x, b.y, b.width, b.height);
        g.fillStyle(tint, 0.18);
        g.fillRect(b.x, b.y, b.width, b.height);
        if (object.color === 'double') {
          g.fillStyle(PLAYER_TINTS.blue, 0.35);
          g.fillRect(b.x + 4, b.y + 4, b.width / 2 - 6, 6);
          g.fillStyle(PLAYER_TINTS.red, 0.35);
          g.fillRect(b.x + b.width / 2 + 2, b.y + 4, b.width / 2 - 6, 6);
        }
      }
      if (object.kind === 'laser') {
        g.fillStyle(WORLD.laserEmitter);
        g.fillRect(
          object.origin.x - LASER_EMITTER_SIZE / 2,
          object.origin.y - LASER_EMITTER_SIZE / 2,
          LASER_EMITTER_SIZE,
          LASER_EMITTER_SIZE,
        );
      }
    }
  }

  render(snapshot: SimulationSnapshot): void {
    const g = this.dynamicLayer;
    g.clear();

    // Buttons
    for (const object of this.level.objects) {
      if (object.kind !== 'button') continue;
      const pressed = snapshot.buttons[object.id] === true;
      const squash = pressed ? 4 : 0;
      g.fillStyle(pressed ? WORLD.buttonPressed : WORLD.button);
      g.fillRect(
        object.position.x,
        object.position.y + squash,
        BUTTON_WIDTH,
        BUTTON_HEIGHT - squash,
      );
    }

    // Doors
    for (const object of this.level.objects) {
      if (object.kind !== 'door') continue;
      const open = snapshot.doors[object.id] === true;
      const b = object.bounds;
      if (open) {
        g.lineStyle(2, WORLD.doorOpen, 0.9);
        g.strokeRect(b.x, b.y, b.width, b.height);
      } else {
        g.fillStyle(WORLD.door);
        g.fillRect(b.x, b.y, b.width, b.height);
      }
    }

    // Platforms & elevators
    for (const object of this.level.objects) {
      if (object.kind !== 'movingPlatform' && object.kind !== 'elevator') continue;
      const position = snapshot.platforms[object.id];
      if (!position) continue;
      g.fillStyle(WORLD.platform);
      g.fillRect(position.x, position.y, object.size.width, object.size.height);
      g.lineStyle(1, WORLD.solidEdge);
      g.strokeRect(position.x, position.y, object.size.width, object.size.height);
    }

    // Laser beams (computed exactly like the simulation computes them)
    const firing = this.level.objects.filter(
      (o) => o.kind === 'laser' && snapshot.lasers[o.id] === true,
    );
    if (firing.length > 0) {
      const obstacles = beamObstaclesFromSnapshot(this.level, snapshot);
      for (const object of firing) {
        if (object.kind !== 'laser') continue;
        const beam = computeLaserBeam(object, obstacles);
        g.fillStyle(WORLD.laserBeam, 0.85);
        g.fillRect(beam.x, beam.y, beam.width, beam.height);
      }
    }

    // Clones (under players)
    for (const clone of snapshot.clones) {
      const tint = CLONE_TINTS[clone.owner];
      g.fillStyle(tint, 0.55);
      g.fillRect(clone.position.x, clone.position.y, PLAYER_SIZE, PLAYER_SIZE);
      g.lineStyle(2, PLAYER_TINTS[clone.owner], 0.9);
      g.strokeRect(clone.position.x + 1, clone.position.y + 1, PLAYER_SIZE - 2, PLAYER_SIZE - 2);
    }

    // Players
    for (const player of Object.values(snapshot.players)) {
      const teleporting = player.teleportTicksLeft > 0;
      const alpha = teleporting ? 0.25 : 1;
      g.fillStyle(PLAYER_TINTS[player.color], alpha);
      g.fillRect(player.position.x, player.position.y, PLAYER_SIZE, PLAYER_SIZE);
      if (!teleporting) {
        // simple "eyes" so the cubes read as characters
        g.fillStyle(0x111216, 1);
        g.fillRect(player.position.x + 6, player.position.y + 8, 4, 6);
        g.fillRect(player.position.x + PLAYER_SIZE - 10, player.position.y + 8, 4, 6);
      }
    }
  }
}
