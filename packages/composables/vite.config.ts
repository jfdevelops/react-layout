import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@jfdevelops/react-layout-internals': path.resolve(
        __dirname,
        '../internals/src/index.ts',
      ),
      '@jfdevelops/react-layout-validator': path.resolve(
        __dirname,
        '../validators/src/index.ts',
      ),
      '@jfdevelops/react-layout-adapters': path.resolve(
        __dirname,
        '../adapters/src/index.ts',
      ),
      '@jfdevelops/react-layout-adapter-zod': path.resolve(
        __dirname,
        '../adapter-zod/src/index.ts',
      ),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './vitest.setup.ts',
  },
});
