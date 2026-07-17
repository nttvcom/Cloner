const COOP_KEY = 'cloner.progress';
const SOLO_KEY = 'cloner.progress.solo';

function read(key: string): number {
  const raw = Number(localStorage.getItem(key) ?? '0');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/** Number of co-op campaign levels completed (0 = nothing yet). */
export function getProgress(): number {
  return read(COOP_KEY);
}

/** Number of single-player levels completed. */
export function getSoloProgress(): number {
  return read(SOLO_KEY);
}

export function recordLevelComplete(levelIndex: number, solo = false): void {
  const key = solo ? SOLO_KEY : COOP_KEY;
  if (levelIndex + 1 > read(key)) {
    localStorage.setItem(key, String(levelIndex + 1));
  }
}
