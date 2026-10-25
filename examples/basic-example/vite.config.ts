import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { allowedHosts: ['.localhost'] },
  preview: { allowedHosts: ['.localhost'] },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@jfdevelops/react-layout-devtools-react': resolve(rootDir, '../../packages/devtools-react/src/index.ts'),
      '@jfdevelops/react-layout-devtools-core': resolve(rootDir, '../../packages/devtools-core/src/index.ts'),
      '@jfdevelops/react-layout': resolve(rootDir, '../../packages/core/src/index.ts'),
      '@': resolve(rootDir, './src'),
      'view-map': resolve(rootDir, '../../packages/core/src/index.ts'),
    },
  },
});
