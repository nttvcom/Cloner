import Phaser from 'phaser';
import type { InputMap, PlayerInput } from '@cloner/shared';

const K = Phaser.Input.Keyboard.KeyCodes;

interface Binding {
  left: number;
  right: number;
  jump: number;
  placeClone: number;
  removeClone: number;
  down: number;
}

/** Designer-approved defaults: P1 = WASD + E/F, P2 = Arrows + K/L. */
const P1: Binding = { left: K.A, right: K.D, jump: K.W, placeClone: K.E, removeClone: K.F, down: K.S };
const P2: Binding = { left: K.LEFT, right: K.RIGHT, jump: K.UP, placeClone: K.K, removeClone: K.L, down: K.DOWN };

type KeySet = Record<keyof Binding, Phaser.Input.Keyboard.Key>;

function addKeys(scene: Phaser.Scene, binding: Binding): KeySet {
  const keyboard = scene.input.keyboard!;
  return {
    left: keyboard.addKey(binding.left),
    right: keyboard.addKey(binding.right),
    jump: keyboard.addKey(binding.jump),
    placeClone: keyboard.addKey(binding.placeClone),
    removeClone: keyboard.addKey(binding.removeClone),
    down: keyboard.addKey(binding.down),
  };
}

function read(keys: KeySet): PlayerInput {
  return {
    left: keys.left.isDown,
    right: keys.right.isDown,
    jump: keys.jump.isDown,
    placeClone: keys.placeClone.isDown,
    removeClone: keys.removeClone.isDown,
    down: keys.down.isDown,
  };
}

/** Both players on one keyboard (Duo mode). Blue is P1, red is P2. */
export class DuoKeyboard {
  private readonly p1: KeySet;
  private readonly p2: KeySet;

  constructor(scene: Phaser.Scene) {
    this.p1 = addKeys(scene, P1);
    this.p2 = addKeys(scene, P2);
  }

  readInputs(): InputMap {
    return { blue: read(this.p1), red: read(this.p2) };
  }
}

/** One online player: both key sets act, so WASD and Arrows both work. */
export class SoloKeyboard {
  private readonly a: KeySet;
  private readonly b: KeySet;

  constructor(scene: Phaser.Scene) {
    this.a = addKeys(scene, P1);
    this.b = addKeys(scene, P2);
  }

  readInput(): PlayerInput {
    const a = read(this.a);
    const b = read(this.b);
    return {
      left: a.left || b.left,
      right: a.right || b.right,
      jump: a.jump || b.jump,
      placeClone: a.placeClone || b.placeClone,
      removeClone: a.removeClone || b.removeClone,
      down: (a.down ?? false) || (b.down ?? false),
    };
  }
}
