// @vitest-environment node
import type * as TypeScript from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const published = process.env.REACT_LAYOUT_TYPE_ENTRY === 'dist';

it.each(['typescript-5-9', 'typescript'])(
  `preserves the app's factory → state → layout → JSX types with %s (${
    published ? 'published declarations' : 'source'
  })`,
  (compilerPackage) => {
    const ts: typeof TypeScript = require(compilerPackage);
    const config = ts.readConfigFile(
      resolve(root, 'tsconfig.json'),
      ts.sys.readFile
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const paths = published
      ? {
          '@jfdevelops/react-layout': [resolve(root, 'dist/index.d.mts')],
        }
      : parsed.options.paths;
    const program = ts.createProgram({
      rootNames: [
        resolve(root, 'tests/create-config/fixtures/named-factory/usage.tsx'),
        resolve(root, 'vitest.setup.ts'),
      ],
      options: { ...parsed.options, paths },
    });
    expect(
      program.getSourceFile(
        resolve(root, published ? 'dist/index.d.mts' : 'src/index.ts')
      )
    ).toBeDefined();
    const fixtureRoot = resolve(
      root,
      'tests/create-config/fixtures/named-factory'
    );
    // Check the consumer modules with each compiler. The implementation itself
    // is checked separately by the workspace's own TypeScript compiler.
    const diagnostics = [
      ...program.getOptionsDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program
        .getSourceFiles()
        .filter((file) => file.fileName.startsWith(fixtureRoot))
        .flatMap((file) => program.getSemanticDiagnostics(file)),
    ];
    expect(
      diagnostics.map((d) => {
        const location =
          d.file && d.start !== undefined
            ? `${d.file.fileName}:${
                d.file.getLineAndCharacterOfPosition(d.start).line + 1
              }: `
            : '';
        return location + ts.flattenDiagnosticMessageText(d.messageText, '\n');
      })
    ).toEqual([]);
  },
  30_000
);
