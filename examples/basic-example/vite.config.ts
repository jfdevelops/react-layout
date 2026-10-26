import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactLayoutDevtools } from '../../packages/devtools-vite/src';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  server: { allowedHosts: ['.localhost'] },
  preview: { allowedHosts: ['.localhost'] },
  plugins: [
    react(),
    tailwindcss(),
    reactLayoutDevtools({
      production: process.env.REACT_LAYOUT_DEVTOOLS_PRODUCTION === 'true',
    }),
  ],
  resolve: {
    alias: {
      ...(command === 'serve'
        ? {
            '@jfdevelops/react-layout-devtools-react': resolve(
              rootDir,
              '../../packages/devtools-react/src/index.ts'
            ),
          }
        : {}),
      '@jfdevelops/react-layout-devtools-core': resolve(
        rootDir,
        '../../packages/devtools-core/src/index.ts'
      ),
      '@jfdevelops/react-layout': resolve(
        rootDir,
        '../../packages/core/src/index.ts'
      ),
      '@': resolve(rootDir, './src'),
      'view-map': resolve(rootDir, '../../packages/core/src/index.ts'),
    },
  },
}));
