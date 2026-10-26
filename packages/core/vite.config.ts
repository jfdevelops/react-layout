import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { allowedHosts: ['.localhost'] },
  preview: { allowedHosts: ['.localhost'] },
  resolve: {
    alias: {
      '@jfdevelops/react-layout-composable-breadcrumb': path.resolve(
        __dirname,
        '../composable-breadcrumb/src/index.ts',
      ),
      '@jfdevelops/react-layout-devtools-core': path.resolve(
        __dirname,
        '../devtools-core/src/index.ts',
      ),
      '@jfdevelops/react-layout-validator': path.resolve(
        __dirname,
        '../validators/src/index.ts',
      ),
      '@jfdevelops/react-layout-composables': path.resolve(
        __dirname,
        '../composables/src/index.ts',
      ),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
