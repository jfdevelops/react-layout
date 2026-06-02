import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  sourcemap: true,
  minify: false,
  exports: true,
  format: ['cjs', 'es'],
  clean: true,
  dts: true,
  fixedExtension: true,
  tsconfig: 'tsconfig.build.json',
});
