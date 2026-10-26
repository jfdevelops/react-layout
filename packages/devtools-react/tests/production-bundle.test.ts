// @vitest-environment node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function bundle(entry: string) {
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    resolve: {
      alias: {
        '@jfdevelops/react-layout-devtools-core': path.resolve(
          root,
          '../devtools-core/src/index.ts'
        ),
      },
    },
    build: {
      write: false,
      minify: true,
      rollupOptions: {
        input: path.resolve(root, `src/${entry}.ts`),
        preserveEntrySignatures: 'strict',
        external: ['react', 'react-dom', 'react/jsx-runtime'],
      },
    },
  });

  const outputs = Array.isArray(result) ? result : [result];

  return outputs
    .flatMap((output) => ('output' in output ? output.output : []))
    .filter((chunk) => chunk.type === 'chunk')
    .map((chunk) => chunk.code)
    .join('\n');
}

it('removes the inspector implementation from the default production bundle', async () => {
  const code = await bundle('index');

  expect(code).not.toContain('Scrollable relationship graph');
  expect(code).not.toContain('react-layout-devtools:preferences');
  expect(code.length).toBeLessThan(1000);
});

it('retains the inspector when the production entry is explicitly imported', async () => {
  const code = await bundle('production');

  expect(code).toContain('Scrollable relationship graph');
  expect(code).toContain('react-layout-devtools:preferences');
});
