import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/e2e/**', '**/dist/**', '**/node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@elizaos/core': path.resolve(__dirname, '../core/src'),
    },
  },
});
