import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // TASK-018: jsdom lets us mount real Vue components (views, DataTable,
    // charts) in vitest and run axe-core against the rendered DOM, on top of
    // the pure-logic specs that ran fine under vitest's default 'node'
    // environment. jsdom is a strict superset for those (no DOM APIs they
    // needed), so this doesn't change any existing test's behavior.
    environment: 'jsdom',
  },
});
