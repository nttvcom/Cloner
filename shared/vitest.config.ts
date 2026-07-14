import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 'threads' keeps workers in-process; the default 'forks' pool spawns
    // child processes, which some sandboxed/CI shells forbid.
    pool: 'threads',
  },
});
