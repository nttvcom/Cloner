import Phaser from 'phaser';
import {
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  LASER_EMITTER_SIZE,
  PLAYER_SIZE,
  aabbIntersects,
  beamObstaclesFromSnapshot,
  computeLaserBeam,
  PLAYER_COLORS,
  type AABB,
  type LevelDefinition,
  type PlayerColor,
  type SimulationSnapshot,
  type Vec2,
} from '@cloner/shared';
import { EXIT_TINTS, PLAYER_TINTS, WORLD } from '../colors';
import { cloneTextureKey, ensureGameTextures, playerTextureKey } from './textures';

interface PlayerView {
  sprite: Phaser.GameObjects.Image;
  wasGrounded: boolean;
  wasTeleporting: boolean;
}

interface CloneView {
  sprite: Phaser.GameObjects.Image;
  owner: PlayerColor;
  matched: boolean;
}

interface DoorView {
  rect: Phaser.GameObjects.Rectangle;
  bounds: AABB;
  wasOpen: boolean;
}

interface ButtonView {
  plate: Phaser.GameObjects.Rectangle;
  center: Vec2;
  wasPressed: boolean;
}

/**
 * Sprite-based presenter for one level. All game objects persist across
 * frames (transform updates only — the per-frame Graphics rebuild of the
 * first version was a main FPS sink); discrete state changes are detected
 * by diffing consecutive snapshots and drive the juice: pops, rings,
 * squash-and-stretch, door slides, death bursts. Works identically for
 * local play and online snapshots.
 */
export class LevelRenderer {
  private readonly scene: Phaser.Scene;
  private readonly level: LevelDefinition;

  private readonly staticLayer: Phaser.GameObjects.Graphics;
  private readonly wireLayer: Phaser.GameObjects.Graphics;
  private readonly beamLayer: Phaser.GameObjects.Graphics;

  private readonly players = {} as Record<PlayerColor, PlayerView>;
  private cloneViews: CloneView[] = [];
  private readonly doors = new Map<string, DoorView>();
  private readonly buttons = new Map<string, ButtonView>();
  private readonly platforms = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly exitGlows = new Map<string, Phaser.GameObjects.Rectangle>();

  private prev: SimulationSnapshot | null = null;
  private beamCache = '';
  private wireCache = '';
  private readonly spawned: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, level: LevelDefinition) {
    this.scene = scene;
    this.level = level;
    ensureGameTextures(scene);

    this.staticLayer = scene.add.graphics().setDepth(1);
    this.wireLayer = scene.add.graphics().setDepth(0);
    this.beamLayer = scene.add.graphics().setDepth(5);

    this.drawStatic();
    this.buildObjects();
    this.buildPlayers();
  }

  destroy(): void {
    this.staticLayer.destroy();
    this.wireLayer.destroy();
    this.beamLayer.destroy();
    for (const color of PLAYER_COLORS) this.players[color]?.sprite.destroy();
    for (const view of this.cloneViews) view.sprite.destroy();
    for (const door of this.doors.values()) door.rect.destroy();
    for (const button of this.buttons.values()) button.plate.destroy();
    for (const platform of this.platforms.values()) platform.destroy();
    for (const glow of this.exitGlows.values()) glow.destroy();
    for (const fx of this.spawned) fx.destroy();
  }

  // ---------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------

  private drawStatic(): void {
    const g = this.staticLayer;
    for (const solid of this.level.solids) {
      g.fillStyle(WORLD.solid);
      g.fillRect(solid.x, solid.y, solid.width, solid.height);
      // lighter top face reads as walkable ground
      g.fillStyle(WORLD.solidTop);
      g.fillRect(solid.x, solid.y, solid.width, Math.min(5, solid.height));
    }
    for (const object of this.level.objects) {
      if (object.kind === 'exit') {
        const b = object.bounds;
        const tint = EXIT_TINTS[object.color];
        g.lineStyle(3, tint, 0.95);
        g.strokeRoundedRect(b.x, b.y, b.width, b.height, 5);
        if (object.color === 'double') {
          g.fillStyle(PLAYER_TINTS.blue, 0.5);
          g.fillRect(b.x + 5, b.y + 5, b.width / 2 - 8, 5);
          g.fillStyle(PLAYER_TINTS.red, 0.5);
          g.fillRect(b.x + b.width / 2 + 3, b.y + 5, b.width / 2 - 8, 5);
        }
        const glow = this.scene.add
          .rectangle(b.x + b.width / 2, b.y + b.height / 2, b.width - 6, b.height - 6, tint, 0.14)
          .setDepth(1);
        this.scene.tweens.add({
          targets: glow,
          fillAlpha: { from: 0.1, to: 0.24 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.exitGlows.set(object.id, glow);
      }
      if (object.kind === 'laser') {
        g.fillStyle(WORLD.laserEmitter);
        g.fillRoundedRect(
          object.origin.x - LASER_EMITTER_SIZE / 2,
          object.origin.y - LASER_EMITTER_SIZE / 2,
          LASER_EMITTER_SIZE,
          LASER_EMITTER_SIZE,
          3,
        );
        g.fillStyle(WORLD.laserBeam);
        g.fillCircle(object.origin.x, object.origin.y, 3);
      }
      if (object.kind === 'button') {
        // static dark base under the animated plate
        g.fillStyle(WORLD.buttonBase);
        g.fillRect(object.position.x - 3, object.position.y + BUTTON_HEIGHT - 3, BUTTON_WIDTH + 6, 5);
      }
    }
  }

  private buildObjects(): void {
    for (const object of this.level.objects) {
      if (object.kind === 'door') {
        const b = object.bounds;
        const rect = this.scene.add
          .rectangle(b.x + b.width / 2, b.y, b.width, b.height, WORLD.door)
          .setOrigin(0.5, 0)
          .setStrokeStyle(2, WORLD.doorEdge, 0.8)
          .setDepth(2);
        this.doors.set(object.id, { rect, bounds: b, wasOpen: false });
      }
      if (object.kind === 'button') {
        const center = {
          x: object.position.x + BUTTON_WIDTH / 2,
          y: object.position.y + BUTTON_HEIGHT,
        };
        const plate = this.scene.add
          .rectangle(center.x, center.y, BUTTON_WIDTH, BUTTON_HEIGHT, WORLD.button)
          .setOrigin(0.5, 1)
          .setDepth(2);
        this.buttons.set(object.id, { plate, center, wasPressed: false });
      }
      if (object.kind === 'movingPlatform' || object.kind === 'elevator') {
        const start = object.kind === 'movingPlatform' ? object.path[0]! : object.from;
        const rect = this.scene.add
          .rectangle(
            start.x + object.size.width / 2,
            start.y + object.size.height / 2,
            object.size.width,
            object.size.height,
            WORLD.platform,
          )
          .setStrokeStyle(1.5, WORLD.platformEdge, 0.9)
          .setDepth(2);
        this.platforms.set(object.id, rect);
      }
    }
  }

  private buildPlayers(): void {
    for (const color of PLAYER_COLORS) {
      const spawn = this.level.spawns[color];
      const sprite = this.scene.add
        .image(spawn.x + PLAYER_SIZE / 2, spawn.y + PLAYER_SIZE / 2, playerTextureKey(color))
        .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE)
        .setDepth(8);
      this.players[color] = { sprite, wasGrounded: false, wasTeleporting: false };
    }
  }

  // ---------------------------------------------------------------------
  // Per-frame render
  // ---------------------------------------------------------------------

  render(snapshot: SimulationSnapshot): void {
    const prev = this.prev;

    // A tick that went backwards = death reset: burst where everyone was.
    if (prev && snapshot.tick < prev.tick) {
      for (const color of PLAYER_COLORS) {
        const p = prev.players[color];
        this.burst(p.position.x + PLAYER_SIZE / 2, p.position.y + PLAYER_SIZE / 2, PLAYER_TINTS[color], 12);
      }
      this.scene.cameras.main.shake(160, 0.006);
      this.scene.cameras.main.flash(200, 255, 70, 70);
    }

    this.renderPlayers(snapshot);
    this.renderClones(snapshot);
    this.renderDoors(snapshot);
    this.renderButtons(snapshot);
    this.renderPlatforms(snapshot);
    this.renderBeams(snapshot);
    this.renderWires(snapshot);
    this.renderExitGlows(snapshot);

    this.prev = snapshot;
  }

  private renderPlayers(snapshot: SimulationSnapshot): void {
    for (const color of PLAYER_COLORS) {
      const state = snapshot.players[color];
      const view = this.players[color];
      const sprite = view.sprite;
      const cx = state.position.x + PLAYER_SIZE / 2;
      const cy = state.position.y + PLAYER_SIZE / 2;
      const teleporting = state.teleportTicksLeft > 0;

      if (teleporting && !view.wasTeleporting) {
        // Dissolve where the clone was just placed.
        this.ring(cx, cy, PLAYER_TINTS[color]);
        sprite.setVisible(false);
      }
      if (!teleporting && view.wasTeleporting) {
        // Re-materialize at spawn.
        sprite.setVisible(true);
        sprite.setPosition(cx, cy);
        sprite.setScale(0.2);
        sprite.setAlpha(0.2);
        this.scene.tweens.add({
          targets: sprite,
          alpha: 1,
          duration: 220,
          ease: 'Quad.easeOut',
          onUpdate: () => sprite.setDisplaySize(PLAYER_SIZE * sprite.alpha, PLAYER_SIZE * sprite.alpha),
          onComplete: () => sprite.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE),
        });
        this.ring(cx, cy, PLAYER_TINTS[color]);
      }

      if (!teleporting) {
        sprite.setPosition(cx, cy);
        // Squash & stretch: stretch while falling/jumping, squash on landing.
        if (!view.wasGrounded && state.isGrounded) {
          this.scene.tweens.add({
            targets: sprite,
            displayWidth: { from: PLAYER_SIZE * 1.18, to: PLAYER_SIZE },
            displayHeight: { from: PLAYER_SIZE * 0.78, to: PLAYER_SIZE },
            duration: 140,
            ease: 'Back.easeOut',
          });
        } else if (!state.isGrounded && !this.scene.tweens.isTweening(sprite)) {
          const vy = Math.min(Math.abs(state.velocity.y) / 900, 1);
          sprite.setDisplaySize(PLAYER_SIZE * (1 - vy * 0.08), PLAYER_SIZE * (1 + vy * 0.1));
        }
        // Slight lean into horizontal movement.
        sprite.setRotation(Phaser.Math.Clamp(state.velocity.x / 220, -1, 1) * 0.06);
      }

      view.wasGrounded = state.isGrounded;
      view.wasTeleporting = teleporting;
    }
  }

  private renderClones(snapshot: SimulationSnapshot): void {
    for (const view of this.cloneViews) view.matched = false;

    for (const clone of snapshot.clones) {
      const cx = clone.position.x + PLAYER_SIZE / 2;
      const cy = clone.position.y + PLAYER_SIZE / 2;
      // Clones only move when riding platforms, so nearest-match by owner is
      // stable and survives platform motion without rebuilding sprites.
      let best: CloneView | null = null;
      let bestDist = 48;
      for (const view of this.cloneViews) {
        if (view.matched || view.owner !== clone.owner) continue;
        const d = Math.abs(view.sprite.x - cx) + Math.abs(view.sprite.y - cy);
        if (d < bestDist) {
          best = view;
          bestDist = d;
        }
      }
      if (best) {
        best.matched = true;
        best.sprite.setPosition(cx, cy);
      } else {
        const sprite = this.scene.add
          .image(cx, cy, cloneTextureKey(clone.owner))
          .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE)
          .setDepth(7)
          .setAlpha(0);
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0.95,
          duration: 180,
          ease: 'Back.easeOut',
          onUpdate: () => {
            const s = PLAYER_SIZE * (0.6 + 0.4 * sprite.alpha);
            sprite.setDisplaySize(s, s);
          },
          onComplete: () => sprite.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE),
        });
        this.ring(cx, cy, PLAYER_TINTS[clone.owner]);
        this.cloneViews.push({ sprite, owner: clone.owner, matched: true });
      }
    }

    // Removed clones fade away.
    this.cloneViews = this.cloneViews.filter((view) => {
      if (view.matched) return true;
      const sprite = view.sprite;
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 160,
        ease: 'Quad.easeIn',
        onComplete: () => sprite.destroy(),
      });
      return false;
    });
  }

  private renderDoors(snapshot: SimulationSnapshot): void {
    for (const [id, view] of this.doors) {
      const open = snapshot.doors[id] === true;
      if (open !== view.wasOpen) {
        view.wasOpen = open;
        this.scene.tweens.killTweensOf(view.rect);
        this.scene.tweens.add({
          targets: view.rect,
          scaleY: open ? 0.08 : 1,
          fillAlpha: open ? 0.5 : 1,
          duration: 240,
          ease: open ? 'Quad.easeOut' : 'Back.easeOut',
        });
      }
    }
  }

  private renderButtons(snapshot: SimulationSnapshot): void {
    for (const [id, view] of this.buttons) {
      const pressed = snapshot.buttons[id] === true;
      if (pressed !== view.wasPressed) {
        view.wasPressed = pressed;
        this.scene.tweens.killTweensOf(view.plate);
        this.scene.tweens.add({
          targets: view.plate,
          scaleY: pressed ? 0.45 : 1,
          duration: 110,
          ease: 'Quad.easeOut',
        });
        view.plate.setFillStyle(pressed ? WORLD.buttonPressed : WORLD.button);
        if (pressed) this.ring(view.center.x, view.center.y - 4, WORLD.button, 26);
      }
    }
  }

  private renderPlatforms(snapshot: SimulationSnapshot): void {
    for (const object of this.level.objects) {
      if (object.kind !== 'movingPlatform' && object.kind !== 'elevator') continue;
      const position = snapshot.platforms[object.id];
      const rect = this.platforms.get(object.id);
      if (position && rect) {
        rect.setPosition(position.x + object.size.width / 2, position.y + object.size.height / 2);
      }
    }
  }

  private renderBeams(snapshot: SimulationSnapshot): void {
    const firing = this.level.objects.filter(
      (o): o is Extract<typeof o, { kind: 'laser' }> => o.kind === 'laser' && snapshot.lasers[o.id] === true,
    );
    if (firing.length === 0) {
      if (this.beamCache !== '') {
        this.beamCache = '';
        this.beamLayer.clear();
      }
      return;
    }
    const obstacles = beamObstaclesFromSnapshot(this.level, snapshot);
    const beams = firing.map((def) => computeLaserBeam(def, obstacles));
    const cache = beams.map((b) => `${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)},${b.height.toFixed(1)}`).join(';');
    if (cache === this.beamCache) return;
    this.beamCache = cache;

    const g = this.beamLayer;
    g.clear();
    for (const beam of beams) {
      // soft glow, then the hot core
      g.fillStyle(WORLD.laserGlow, 0.22);
      g.fillRect(beam.x - 2, beam.y - 2, beam.width + 4, beam.height + 4);
      g.fillStyle(WORLD.laserBeam, 0.9);
      g.fillRect(beam.x, beam.y, beam.width, beam.height);
    }
  }

  /** Faint L-shaped wires from each button to what it powers. */
  private renderWires(snapshot: SimulationSnapshot): void {
    const cache = this.level.objects
      .filter((o) => o.kind === 'button')
      .map((o) => `${o.id}:${snapshot.buttons[o.id] === true}`)
      .join(';');
    if (cache === this.wireCache) return;
    this.wireCache = cache;

    const g = this.wireLayer;
    g.clear();
    for (const object of this.level.objects) {
      if (object.kind !== 'button') continue;
      const active = snapshot.buttons[object.id] === true;
      const from = { x: object.position.x + BUTTON_WIDTH / 2, y: object.position.y + BUTTON_HEIGHT };
      g.lineStyle(1.5, active ? WORLD.wireActive : WORLD.wire, active ? 0.7 : 0.4);
      for (const targetId of object.targets) {
        const to = this.objectAnchor(targetId);
        if (!to) continue;
        g.beginPath();
        g.moveTo(from.x, from.y);
        g.lineTo(from.x, to.y);
        g.lineTo(to.x, to.y);
        g.strokePath();
      }
    }
  }

  private objectAnchor(id: string): Vec2 | null {
    for (const object of this.level.objects) {
      if (object.id !== id) continue;
      switch (object.kind) {
        case 'door':
          return { x: object.bounds.x + object.bounds.width / 2, y: object.bounds.y + object.bounds.height / 2 };
        case 'laser':
          return { x: object.origin.x, y: object.origin.y };
        case 'movingPlatform':
          return { x: object.path[0]!.x + object.size.width / 2, y: object.path[0]!.y };
        case 'elevator':
          return { x: object.from.x + object.size.width / 2, y: (object.from.y + object.to.y) / 2 };
        default:
          return null;
      }
    }
    return null;
  }

  private renderExitGlows(snapshot: SimulationSnapshot): void {
    for (const object of this.level.objects) {
      if (object.kind !== 'exit') continue;
      const glow = this.exitGlows.get(object.id);
      if (!glow) continue;
      const inside = PLAYER_COLORS.some((color) => {
        const p = snapshot.players[color];
        if (!p.isAlive || p.teleportTicksLeft > 0) return false;
        const box: AABB = { x: p.position.x, y: p.position.y, width: PLAYER_SIZE, height: PLAYER_SIZE };
        return aabbIntersects(box, object.bounds);
      });
      glow.setFillStyle(EXIT_TINTS[object.color], inside ? 0.42 : glow.fillAlpha);
    }
  }

  // ---------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------

  private ring(x: number, y: number, color: number, radius = 34): void {
    const circle = this.scene.add.circle(x, y, 6).setStrokeStyle(3, color, 0.9).setDepth(9);
    this.spawned.push(circle);
    this.scene.tweens.add({
      targets: circle,
      radius,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  private burst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      const size = 3 + Math.random() * 5;
      const bit = this.scene.add.rectangle(x, y, size, size, color).setDepth(9);
      this.spawned.push(bit);
      this.scene.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 30,
        angle: Math.random() * 270,
        alpha: 0,
        duration: 450 + Math.random() * 250,
        ease: 'Quad.easeOut',
        onComplete: () => bit.destroy(),
      });
    }
  }

  /** Level-complete confetti above each exit. */
  celebrate(): void {
    for (const object of this.level.objects) {
      if (object.kind !== 'exit') continue;
      const cx = object.bounds.x + object.bounds.width / 2;
      const cy = object.bounds.y;
      this.burst(cx, cy, EXIT_TINTS[object.color], 14);
      this.ring(cx, cy, EXIT_TINTS[object.color], 50);
    }
  }
}
