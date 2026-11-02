// @vitest-environment node
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type * as TypeScript from 'typescript';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);

it.each(['typescript-5-9', 'typescript'])(
  'suggests reusable sources and nested options with %s',
  (compiler) => {
    const ts: typeof TypeScript = require(compiler);
    const root = resolve(
      fileURLToPath(new URL('../..', import.meta.url)),
    ).replaceAll('\\', '/');
    const file = `${root}/tests/create-config/reusable-probe.ts`;
    const source = `
    import { createDefinedResourceLayout, createProp } from '../../src';
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        meta: createProp.object({ owner: createProp.string(), repo: createProp.string() }),
      },
    });
    createReusable({ props: { include: { /*sources*/ } }, fn: () => null });
    createReusable({ props: { include: { options: { /*options*/ } } }, fn: () => null });
    createReusable({ props: { include: { options: { meta: { /*nested*/ } } } }, fn: () => null });
    const empty = createDefinedResourceLayout({ resources: ['users'] });
    empty.createReusable({ props: { include: { /*empty*/ } }, fn: () => null });
  `;
    const config = ts.readConfigFile(`${root}/tsconfig.json`, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const isProbe = (name: string) => name.replaceAll('\\', '/') === file;
    const service = ts.createLanguageService({
      getScriptFileNames: () => [file],
      getScriptVersion: () => '1',
      getScriptSnapshot: (name) => {
        const contents = isProbe(name) ? source : ts.sys.readFile(name);
        return contents === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => parsed.options,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: (name) => isProbe(name) || ts.sys.fileExists(name),
      readFile: (name) => (isProbe(name) ? source : ts.sys.readFile(name)),
      readDirectory: ts.sys.readDirectory,
    });
    try {
      expect(
        service
          .getSemanticDiagnostics(file)
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
      ).toEqual([]);
      for (const [marker, expected] of Object.entries({
        sources: ['options', 'resources'],
        options: ['meta', 'title'],
        nested: ['owner', 'repo'],
        empty: ['resources'],
      })) {
        const entries = service.getCompletionsAtPosition(
          file,
          source.indexOf(`/*${marker}*/`),
          {},
        );
        expect(
          entries?.entries
            .filter(
              (entry) =>
                entry.kind !== ts.ScriptElementKind.memberFunctionElement,
            )
            .map((entry) => entry.name)
            .sort(),
          marker,
        ).toEqual(expected);
      }
    } finally {
      service.dispose();
    }
  },
  30_000,
);
