import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    production: 'src/production.ts',
    disabled: 'src/disabled.ts',
  },
  plugins: [
    {
      name: 'devtools-inline-stylesheet',

      resolveId(id, importer) {
        if (importer && id.endsWith('.css?inline'))
          return resolve(dirname(importer), id);
      },

      load(id) {
        if (!id.endsWith('.css?inline')) return;

        const css = readFileSync(id.slice(0, -'?inline'.length), 'utf8');

        return `export default ${JSON.stringify(css)};`;
      },
    },
  ],
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
