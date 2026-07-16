import Phaser from 'phaser';
import {
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  PLAYER_SIZE,
  PLAYER_COLORS,
  VIEW_HEIGHT,
  beamObstaclesFromSnapshot,
  computeLaserBeam,
  type LevelDefinition,
  type SimulationSnapshot,
} from '@cloner/shared';
import type { GameSession } from '../sessions/GameSession';
import { makeText } from '../ui';

interface DebugCallbacks {
  /** Restart into another campaign level (debug bypasses unlocks). */
  switchLevel: (index: number) => void;
  /** Instant local reset. */
  resetLevel: () => void;
}

/**
 * Hidden developer panel, toggled with Shift+~ in GameScene. Dev/test only:
 * noclip, click-teleport, collision visualization, clone tools, level jump
 * and live object state. Sim-mutating tools work in local (Duo) sessions;
 * online sessions get the read-only overlays.
 */
export class DebugPanel {
  private readonly scene: Phaser.Scene;
  private readonly session: GameSession;
  private readonly level: LevelDefinition;
  private readonly callbacks: DebugCallbacks;
  private readonly levelIndex: number;

  private readonly viz: Phaser.GameObjects.Graphics;
  private readonly infoText: Phaser.GameObjects.Text;
  private readonly legendText: Phaser.GameObjects.Text;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private showColliders = true;
  private readonly keyHandlers: [string, () => void][] = [];
  private readonly pointerHandler: (pointer: Phaser.Input.Pointer) => void;

  constructor(
    scene: Phaser.Scene,
    session: GameSession,
    level: LevelDefinition,
    levelIndex: number,
    callbacks: DebugCallbacks,
  ) {
    this.scene = scene;
    this.session = session;
    this.level = level;
    this.levelIndex = levelIndex;
    this.callbacks = callbacks;

    this.viz = scene.add.graphics().setDepth(25);
    this.bg = scene.add
      .rectangle(6, 46, 320, 236, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(29);
    this.infoText = makeText(scene, 12, 52, '', { size: 10, align: 'left', lineSpacing: 2 })
      .setOrigin(0, 0)
      .setDepth(30)
      .setColor('#9fe870');
    const sim = session.getSimulation();
    this.legendText = makeText(
      scene,
      12,
      196,
      sim
        ? 'C коллизии · 1/2 noclip P1/P2 · X убрать клонов\nU беск. клоны · [/] уровень · R рестарт\nклик=телепорт P1 · shift+клик=P2 · S/↓ вниз в noclip'
        : 'C коллизии (онлайн: только просмотр)',
      { size: 10, align: 'left', color: '#8b909c', lineSpacing: 2 },
    )
      .setOrigin(0, 0)
      .setDepth(30);

    const on = (event: string, fn: () => void): void => {
      this.keyHandlers.push([event, fn]);
      scene.input.keyboard!.on(event, fn);
    };
    on('keydown-C', () => {
      this.showColliders = !this.showColliders;
      if (!this.showColliders) this.viz.clear();
    });
    if (sim) {
      on('keydown-ONE', () => sim.debugSetNoclip('blue', !sim.debugIsNoclip('blue')));
      on('keydown-TWO', () => sim.debugSetNoclip('red', !sim.debugIsNoclip('red')));
      on('keydown-X', () => sim.debugClearClones());
      on('keydown-U', () => sim.debugSetUnlimitedClones(!sim.debugUnlimitedClonesOn()));
      on('keydown-OPEN_BRACKET', () => callbacks.switchLevel(this.levelIndex - 1));
      on('keydown-CLOSED_BRACKET', () => callbacks.switchLevel(this.levelIndex + 1));
    }
    this.pointerHandler = (pointer: Phaser.Input.Pointer): void => {
      const s = this.session.getSimulation();
      if (!s) return;
      const shift = (pointer.event as MouseEvent).shiftKey === true;
      s.debugTeleport(shift ? 'red' : 'blue', pointer.worldX, pointer.worldY);
    };
    scene.input.on('pointerdown', this.pointerHandler);
  }

  update(snapshot: SimulationSnapshot | null): void {
    if (snapshot) {
      this.updateInfo(snapshot);
      if (this.showColliders) this.drawColliders(snapshot);
    }
  }

  private updateInfo(snap: SimulationSnapshot): void {
    const sim = this.session.getSimulation();
    const lines: string[] = [
      `tick ${snap.tick}  fps ${Math.round(this.scene.game.loop.actualFps)}  ${this.level.id}`,
    ];
    for (const color of PLAYER_COLORS) {
      const p = snap.players[color];
      const flags = [
        p.isGrounded ? 'gnd' : 'air',
        p.teleportTicksLeft > 0 ? `tp${p.teleportTicksLeft}` : '',
        sim?.debugIsNoclip(color) ? 'NOCLIP' : '',
      ]
        .filter(Boolean)
        .join(' ');
      lines.push(
        `${color === 'blue' ? 'P1' : 'P2'} (${p.position.x.toFixed(0)},${p.position.y.toFixed(0)}) v(${p.velocity.x.toFixed(0)},${p.velocity.y.toFixed(0)}) ${flags}`,
      );
    }
    lines.push(
      `clones ${snap.clones.length}${sim?.debugUnlimitedClonesOn() ? ' [∞]' : ''}: ${snap.clones
        .map((c) => `${c.owner[0]}(${c.position.x.toFixed(0)},${c.position.y.toFixed(0)})`)
        .join(' ')}`,
    );
    const states = (record: Record<string, boolean>, onChar: string): string =>
      Object.entries(record)
        .map(([id, v]) => `${id}:${v ? onChar : '·'}`)
        .join(' ');
    if (Object.keys(snap.buttons).length) lines.push(`btn  ${states(snap.buttons, '■')}`);
    if (Object.keys(snap.doors).length) lines.push(`door ${states(snap.doors, '□')}`);
    if (Object.keys(snap.lasers).length) lines.push(`zap  ${states(snap.lasers, '⚡')}`);
    for (const [id, pos] of Object.entries(snap.platforms)) {
      lines.push(`plat ${id} (${pos.x.toFixed(0)},${pos.y.toFixed(0)})`);
    }
    this.infoText.setText(lines.join('\n'));
  }

  private drawColliders(snap: SimulationSnapshot): void {
    const g = this.viz;
    g.clear();
    // solids: green
    g.lineStyle(1, 0x44ff66, 0.8);
    for (const s of this.level.solids) g.strokeRect(s.x, s.y, s.width, s.height);
    for (const object of this.level.objects) {
      if (object.kind === 'door') {
        // closed doors solid: orange; open: dim
        const open = snap.doors[object.id] === true;
        g.lineStyle(1, open ? 0x666666 : 0xffaa33, open ? 0.4 : 0.9);
        g.strokeRect(object.bounds.x, object.bounds.y, object.bounds.width, object.bounds.height);
      }
      if (object.kind === 'button') {
        g.lineStyle(1, 0xccff44, 0.8);
        g.strokeRect(object.position.x, object.position.y, BUTTON_WIDTH, BUTTON_HEIGHT);
      }
      if (object.kind === 'exit') {
        g.lineStyle(1, 0x44ddff, 0.7);
        g.strokeRect(object.bounds.x, object.bounds.y, object.bounds.width, object.bounds.height);
      }
    }
    // platforms: cyan
    for (const object of this.level.objects) {
      if (object.kind !== 'movingPlatform' && object.kind !== 'elevator') continue;
      const pos = snap.platforms[object.id];
      if (!pos) continue;
      g.lineStyle(1, 0x00ffff, 0.9);
      g.strokeRect(pos.x, pos.y, object.size.width, object.size.height);
      // path/track hint
      g.lineStyle(1, 0x00ffff, 0.25);
      if (object.kind === 'elevator') {
        g.lineBetween(
          object.from.x + object.size.width / 2,
          object.from.y,
          object.to.x + object.size.width / 2,
          object.to.y,
        );
      } else {
        for (let i = 0; i < object.path.length; i += 1) {
          const a = object.path[i]!;
          const b = object.path[(i + 1) % object.path.length]!;
          g.lineBetween(
            a.x + object.size.width / 2,
            a.y + object.size.height / 2,
            b.x + object.size.width / 2,
            b.y + object.size.height / 2,
          );
        }
      }
    }
    // clones: magenta, players: yellow
    g.lineStyle(1, 0xff44ff, 0.9);
    for (const clone of snap.clones) {
      g.strokeRect(clone.position.x, clone.position.y, PLAYER_SIZE, PLAYER_SIZE);
    }
    g.lineStyle(1, 0xffee44, 0.9);
    for (const color of PLAYER_COLORS) {
      const p = snap.players[color];
      if (p.teleportTicksLeft > 0) continue;
      g.strokeRect(p.position.x, p.position.y, PLAYER_SIZE, PLAYER_SIZE);
    }
    // live beams: red boxes
    const firing = this.level.objects.filter(
      (o): o is Extract<typeof o, { kind: 'laser' }> => o.kind === 'laser' && snap.lasers[o.id] === true,
    );
    if (firing.length > 0) {
      const obstacles = beamObstaclesFromSnapshot(this.level, snap);
      g.lineStyle(1, 0xff3333, 0.9);
      for (const def of firing) {
        const beam = computeLaserBeam(def, obstacles);
        g.strokeRect(beam.x, beam.y, beam.width, beam.height);
      }
    }
    void VIEW_HEIGHT;
  }

  destroy(): void {
    for (const [event, fn] of this.keyHandlers) {
      this.scene.input.keyboard?.off(event, fn);
    }
    this.scene.input.off('pointerdown', this.pointerHandler);
    // Leave the sim clean: noclip/unlimited off when the panel closes.
    const sim = this.session.getSimulation();
    if (sim) {
      sim.debugSetNoclip('blue', false);
      sim.debugSetNoclip('red', false);
      sim.debugSetUnlimitedClones(false);
    }
    this.viz.destroy();
    this.infoText.destroy();
    this.legendText.destroy();
    this.bg.destroy();
  }
}
