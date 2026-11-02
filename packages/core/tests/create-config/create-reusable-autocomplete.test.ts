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
    const entry =
      process.env.REACT_LAYOUT_TYPE_ENTRY === 'dist'
        ? '../../dist/index.mjs'
        : '../../src';
    const source = `
    import { createDefinedResourceLayout, createProp } from '${entry}';
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
    createReusable({ select: { /*selectedSources*/ }, fn: () => null });
    createReusable({ select: { options: { /*selectedOptions*/ } }, fn: () => null });
    createReusable({
      props: { include: { resources: resources => resources.raw()[0] } },
      fn: (props) => {
        const input: 'users' = props.resources;
        return input;
      },
    })();
    const /*hover*/resolvedHelper = createReusable({
      props: { include: { options: { meta: { owner: owner => owner.toUpperCase() } } } },
      select: { options: { title: title => title.length } },
      fn: (props) => {
        const owner: string = props.meta.owner;
        const length: number = props.title;
        return { owner, length };
      },
    });
    resolvedHelper({ options: { meta: { owner: 'jfdevelops' }, title: 'Docs' } });
    const empty = createDefinedResourceLayout({ resources: ['users'] });
    empty.createReusable({ props: { include: { /*empty*/ } }, fn: () => null });
    // @ts-expect-error Selected source values must be supplied.
    resolvedHelper({});
    // @ts-expect-error Every required selected field must be supplied.
    resolvedHelper({ options: { title: 'Docs', meta: {} } });
    // @ts-expect-error Sources are resolved values, not validators.
    resolvedHelper({ options: { title: createProp.string(), meta: { owner: 'owner' } } });
    // @ts-expect-error Unselected fields are not part of the input contract.
    resolvedHelper({ options: { title: 'Docs', meta: { owner: 'owner', repo: 'extra' } } });
    // @ts-expect-error Unknown option selections are rejected.
    createReusable({ select: { options: { title: true, missing: true } }, fn: () => null });
    // @ts-expect-error Unknown nested selections are rejected.
    createReusable({ select: { options: { meta: { missing: true } } }, fn: () => null });
    // @ts-expect-error Primitive option values cannot be drilled into.
    createReusable({ select: { options: { title: { value: true } } }, fn: () => null });
    // @ts-expect-error The callback accepts one resolved argument.
    createReusable({ fn: (props, selected) => selected });
    // @ts-expect-error No option source exists on an unconfigured factory.
    empty.createReusable({ select: { options: true }, fn: () => null });
    const optionalFactory = createDefinedResourceLayout({
      resources: ['users'],
      options: { optional: createProp.object({ label: createProp.string(), count: createProp.number() }).optional() },
    });
    const splitOptional = optionalFactory.createReusable({
      props: { include: { options: { optional: { label: true } } } },
      select: { options: { optional: { count: count => count.toFixed(0) } } },
      fn: props => {
        if (props.optional) {
          // @ts-expect-error Presence of the object does not guarantee the other source's field.
          const count: string = props.optional.count;
          // @ts-expect-error The caller's source container may also be absent.
          const label: string = props.optional.label;
          const maybeCount: string | undefined = props.optional.count;
          return maybeCount;
        }
      },
    });
    splitOptional({ optional: { label: 'Docs' } });
    splitOptional({ options: { optional: { count: 2 } } });
    splitOptional();
    const callerResources = createReusable({ props: { include: { resources: true } }, fn: props => props.resources });
    // @ts-expect-error Caller resource values must be configured resource names.
    callerResources({ resources: ['missing'] });
    // @ts-expect-error Included caller props remain required.
    callerResources({});
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
      const hover = ts.displayPartsToString(
        service.getQuickInfoAtPosition(
          file,
          source.indexOf('/*hover*/') + '/*hover*/'.length,
        )?.displayParts,
      );
      expect(hover).toContain('owner: string');
      expect(hover).toContain('length: number');
      expect(hover).not.toMatch(
        /ReusableInput|SelectedOptionProps|ResolvedBuiltPropShape|SourceValues|Expanded</,
      );
      for (const [marker, expected] of Object.entries({
        sources: ['options', 'resources'],
        selectedSources: ['options', 'resources'],
        selectedOptions: ['meta', 'title'],
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
