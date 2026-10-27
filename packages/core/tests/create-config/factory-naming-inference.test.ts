// @vitest-environment node
import type * as TypeScript from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const typeEntry = process.env.REACT_LAYOUT_TYPE_ENTRY;
const declarationEntry = typeEntry
  ? resolve(root, typeEntry === 'dist' ? 'dist/index.d.mts' : typeEntry)
  : undefined;
const published = declarationEntry !== undefined;

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
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      root
    );
    const paths = published
      ? {
          '@jfdevelops/react-layout': [declarationEntry]
        }
      : parsed.options.paths;
    const completionFile = resolve(
      root,
      'tests/create-config/naming-parts-probe.ts'
    );
    const completionSource = `
      import { defineLayoutName } from '@jfdevelops/react-layout';
      const naming = defineLayoutName(({ resource, capitalize }, parts) =>
        \`\${parts.prefix}\${capitalize(resource)}\${parts.beforeSuffix}Layout\${parts.append}\`
      );
      naming({ /*defaultEmpty*/ });
      naming({ prefix: 'Admin', /*defaultPopulated*/ });
      naming(() => ({ /*defaultCallback*/ }));
      const custom = defineLayoutName.defineParts({ section: 'string', version: 'number' })
        .namingFn(({ capitalize, resource }, parts) =>
          \`\${parts./*customPattern*/section}\${capitalize(resource)}V\${parts.version}\`
        );
      custom({ /*customEmpty*/ });
      custom({ section: 'Admin', /*customPopulated*/ });
      custom(() => ({ /*customCallback*/ }));
      const strings = defineLayoutName.defineParts('section', 'suffix')
        .namingFn(({ resource }, parts) => \`\${parts.section}\${resource}\${parts.suffix}\`);
      strings({ /*stringParts*/ });
    `;
    const service = ts.createLanguageService({
      getScriptFileNames: () => [completionFile],
      getScriptVersion: () => '1',
      getScriptSnapshot: (file) => {
        const contents =
          file === completionFile
            ? completionSource
            : ts.sys.readFile(file);
        return contents === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => ({ ...parsed.options, paths }),
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory
    });
    try {
      for (const [marker, expected] of Object.entries({
        defaultEmpty: ['prefix', 'beforeSuffix', 'append'],
        defaultPopulated: ['beforeSuffix', 'append'],
        defaultCallback: ['prefix', 'beforeSuffix', 'append'],
        customPattern: ['section', 'version'],
        customEmpty: ['section', 'version'],
        customPopulated: ['version'],
        customCallback: ['section', 'version'],
        stringParts: ['section', 'suffix']
      })) {
        const entries = service.getCompletionsAtPosition(
          completionFile,
          completionSource.indexOf('/*' + marker + '*/'),
          {}
        );
        expect(
          entries?.entries.map(({ name }) => name),
          marker
        ).toEqual(expect.arrayContaining(expected));
      }
    } finally {
      service.dispose();
    }
    const program = ts.createProgram({
      rootNames: [
        resolve(
          root,
          'tests/create-config/fixtures/named-factory/usage.tsx'
        ),
        resolve(root, 'vitest.setup.ts')
      ],
      options: { ...parsed.options, paths }
    });
    expect(
      program.getSourceFile(
        declarationEntry ?? resolve(root, 'src/index.ts')
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
        .flatMap((file) => program.getSemanticDiagnostics(file))
    ];
    expect(
      diagnostics.map((d) => {
        const location =
          d.file && d.start !== undefined
            ? `${d.file.fileName}:${
                d.file.getLineAndCharacterOfPosition(d.start).line + 1
              }: `
            : '';
        return (
          location + ts.flattenDiagnosticMessageText(d.messageText, '\n')
        );
      })
    ).toEqual([]);
  },
  30_000
);
