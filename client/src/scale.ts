import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';

/**
 * Crisp-rendering strategy: the game's logical space stays 960x540 (the
 * simulation knows nothing about this), but the canvas backbuffer is
 * RENDER_SCALE times larger and every scene camera zooms by RENDER_SCALE.
 * Vector shapes then rasterize at native resolution instead of being
 * CSS-upscaled (the old blurry look), and text uses `resolution` to match.
 */
export const RENDER_SCALE: number = (() => {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);
  return Math.min(3, Math.max(1, Math.ceil(fit * dpr)));
})();

/** Every scene calls this first: zoom the camera so 960x540 fills the canvas. */
export function setupCamera(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(RENDER_SCALE);
  camera.centerOn(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
}
