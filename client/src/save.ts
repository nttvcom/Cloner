const KEY = 'cloner.progress';

/** Number of campaign levels completed in Duo mode (0 = nothing yet). */
export function getProgress(): number {
  const raw = Number(localStorage.getItem(KEY) ?? '0');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export function recordLevelComplete(levelIndex: number): void {
  if (levelIndex + 1 > getProgress()) {
    localStorage.setItem(KEY, String(levelIndex + 1));
  }
}
