import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@jfdevelops/react-layout-devtools-core': path.resolve(
        __dirname,
        '../devtools-core/src/index.ts'
      ),
      '@jfdevelops/react-layout-validator': path.resolve(
        __dirname,
        '../validators/src/index.ts'
      ),
      '@jfdevelops/react-layout-composables': path.resolve(
        __dirname,
        '../composables/src/index.ts'
      ),
    },
  },
  plugins: [react()],
  test: {
    css: true,
    // DOM-heavy interaction tests need headroom on constrained runners.
    testTimeout: 15000,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './vitest.setup.ts',
  },
});
