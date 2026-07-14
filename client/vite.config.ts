import { defineConfig } from 'vite';

export default defineConfig({
  // @cloner/shared is a workspace symlink shipping raw TypeScript; keep it out
  // of dependency pre-bundling so Vite transforms it like project source.
  optimizeDeps: {
    exclude: ['@cloner/shared'],
  },
  server: {
    port: 5173,
  },
});
