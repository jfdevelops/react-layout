import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  sourcemap: true,
  exports: false,
  format: ['cjs', 'es'],
  clean: true,
  dts: true,
  fixedExtension: true,
  tsconfig: 'tsconfig.build.json',
});
