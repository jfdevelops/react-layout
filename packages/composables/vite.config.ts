import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@jfdevelops/react-layout-validator': path.resolve(
        __dirname,
        '../validators/src/index.ts',
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
