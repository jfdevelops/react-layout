// @vitest-environment node
import type * as TypeScript from 'typescript-6';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url))).replaceAll(
  '\\',
  '/',
);

it.each(['typescript-5-9', 'typescript-6'])(
  'completes schema paths one segment at a time with %s',
  (compilerPackage) => {
    const ts: typeof TypeScript = require(compilerPackage);
    const config = ts.readConfigFile(`${root}/tsconfig.json`, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const file = `${root}/tests/schema-path-probe.ts`;
    const probe = `
    import { builtIn, defineComposableComponent } from '@jfdevelops/react-layout';
    const createList = defineComposableComponent({
      name: 'List',
      props: {
        items: builtIn.record(builtIn.object({ value: builtIn.string, count: builtIn.number })),
        title: builtIn.string,
      },
    });
    createList.getSchema('/*root*/');
    createList.getSchema('items./*record*/');
    createList.getSchema('items.[string]./*object*/');
    const createTabs = createList.extend({ name: 'Tabs', rename: { items: 'tabs' } });
    createTabs.getSchema('/*extended*/');
    const contextual = defineComposableComponent.defineContext({}).handler(() => ({
      name: 'Contextual', props: { tone: builtIn.string },
    }));
    contextual.getSchema('/*context*/');
  `;
    const source = probe.replace(/\/\*\w+\*\//g, '');
    const isProbe = (candidate: string) =>
      candidate.replaceAll('\\', '/') === file;
    const service = ts.createLanguageService({
      getScriptFileNames: () => [file],
      getScriptVersion: () => '1',
      getScriptSnapshot: (candidate) => {
        const contents = isProbe(candidate)
          ? source
          : ts.sys.readFile(candidate);

        return contents === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => parsed.options,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: (candidate) =>
        isProbe(candidate) || ts.sys.fileExists(candidate),
      readFile: (candidate) =>
        isProbe(candidate) ? source : ts.sys.readFile(candidate),
      readDirectory: ts.sys.readDirectory,
    });

    try {
      for (const [marker, expected] of Object.entries({
        root: ['items', 'title'],
        record: ['items.[string]'],
        object: ['items.[string].value', 'items.[string].count'],
        extended: ['tabs', 'title'],
        context: ['tone'],
      })) {
        const before = probe
          .slice(0, probe.indexOf('/*' + marker + '*/'))
          .replace(/\/\*\w+\*\//g, '');
        const prefix = before.slice(before.lastIndexOf("'") + 1);
        const completions = service.getCompletionsAtPosition(
          file,
          before.length,
          {},
        );

        expect(
          completions?.entries
            .map(({ name }) => name)
            .filter((name) => name.startsWith(prefix))
            .sort(),
        ).toEqual(expected.sort());
      }
    } finally {
      service.dispose();
    }
  },
  30_000,
);
