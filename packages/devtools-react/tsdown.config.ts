import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    production: 'src/production.ts',
    disabled: 'src/disabled.ts',
  },
  deps: { alwaysBundle: ['@jfdevelops/react-layout-devtools-core'] },
  sourcemap: true,
  minify: false,
  exports: false,
  format: ['cjs', 'es'],
  clean: true,
  dts: true,
  fixedExtension: true,
  tsconfig: 'tsconfig.build.json',
});
