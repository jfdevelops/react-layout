import { defineConfig } from 'tsdown';

export default defineConfig({
  deps: {
    alwaysBundle: ['@jfdevelops/react-layout-internals'],
    dts: {
      alwaysBundle: [
        '@jfdevelops/create-error',
        '@jfdevelops/react-layout-internals',
      ],
    },
  },
  entry: {
    index: 'src/index.ts',
  },
  unbundle: true,
  sourcemap: true,
  minify: false,
  exports: false,
  format: ['cjs', 'es'],
  clean: true,
  dts: true,
  fixedExtension: true,
  tsconfig: 'tsconfig.build.json',
});
