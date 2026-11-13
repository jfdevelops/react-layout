import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      benchmark: {
        include: ['bench/**/*.bench.{ts,tsx}'],
      },
    },
  }),
);
