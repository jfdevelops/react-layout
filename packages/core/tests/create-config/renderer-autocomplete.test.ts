// @vitest-environment node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as TypeScript from 'typescript-6';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);

it.each(['typescript-5-9', 'typescript-6'])(
  'suggests renderer and builder parameter options with %s',
  (compiler) => {
    const ts: typeof TypeScript = require(compiler);
    const root = resolve(
      fileURLToPath(new URL('../..', import.meta.url)),
    ).replaceAll('\\', '/');
    const file = `${root}/tests/create-config/renderer-autocomplete-probe.tsx`;
    const entry =
      process.env.REACT_LAYOUT_TYPE_ENTRY === 'dist'
        ? '../../dist/index.mjs'
        : '../../src';
    const source = `
      import { defineResourceLayout } from '${entry}';
      import { z } from 'zod';
      const { createResourceConfig } = defineResourceLayout({
        resources: [{ value: 'users', subResources: ['admins', { value: 'managers', subResources: ['female'] }] }],
        layout: { render: () => <main /> },
      });
      const pages = createResourceConfig({ users: { component: <main />, detail: { component: <main />, errorComponent: <main /> }, admins: { component: <main /> }, managers: { component: <main />, female: { component: <main /> } } } });
      const renderPage = pages.createRenderer({
        params: { include: { keys: true } },
        render: () => null,
        factory: { props: { label: z.string() }, render: (props) => props.label },
      });
      const renderUsers = renderPage('users');
      renderUsers({ /*factoryOptions*/ });
      renderUsers({ component: '/*factoryKeys*/', props: { label: 'Users' } });
      renderUsers({ component: '*', props: { /*wildcardProps*/ } });
      renderUsers({ component: 'component', props: { /*singleProps*/ } });
      renderUsers({ component: 'component', props: { /*objectProps*/ } });
      const renderCustom = pages.createRenderer({
        params: { include: { keys: true }, custom: { count: z.number() } },
        render: () => null,
        factory: { render: (_props, { context }) => context.count },
      });
      const customUsers = renderCustom('users');
      customUsers({ component: '*', params: { /*factoryParams*/ } });
      const renderOptional = pages.createRenderer({
        params: { include: { keys: true } },
        render: () => null,
        factory: { props: { label: z.string().optional() }, render: (props) => props.label },
      });
      const optionalUsers = renderOptional('users');
      optionalUsers({ component: '*', props: { /*optionalWildcardProps*/ } });
      optionalUsers({ component: 'component', props: { /*optionalSingleProps*/ } });
      pages.createRenderer({ params: { /*params*/ }, render: () => null });
      pages.createRenderer({ params: { include: { /*empty*/ } }, render: () => null });
      pages.createRenderer({ params: { include: { path: true, /*populated*/ } }, render: () => null });
      pages.createRenderer({ params: { include: { keys: true, /*keysFirst*/ } }, render: () => null });
      pages.createRenderer({ params: { include: { path: { /*path*/ } } }, render: () => null });
      pages.createRenderer({ params: { include: { keys: { /*keys*/ } } }, render: () => null });
      pages.createRenderer({ factory: { render: (_props, { context }) => context.Component }, params: { include: { /*factory*/ } }, render: () => null });
      pages.createRenderer({ params: { include: { path: { optional: true, pick: { /*rendererPick*/ } } } }, render: () => null });
      pages.createRenderer({ params: { include: { path: { pick: { resource: true, /*rendererPickPopulated*/ } } } }, render: () => null });
      pages.forPaths('$resource.$subResource').addParams({ include: { path: { pick: { /*builderPick*/ } } } });
      pages.forPaths('users.$subResource').addParams({ include: { path: { pick: { /*scopedPick*/ } } } });
      pages.forPaths('$resource.$component').addParams({ include: { path: { pick: { /*componentPick*/ } } } });
      pages.createRenderer({ params: { include: { path: { pick: { resource: { /*resourceValues*/ } } } } }, render: () => null });
      pages.createRenderer({ params: { include: { path: { pick: { resource: { users: { /*resourceChildren*/ } } } } } }, render: () => null });
      pages.createRenderer({ params: { include: { path: { pick: { resource: { users: { managers: { /*resourceGrandchildren*/ } } } } } } }, render: () => null });
      pages.forPaths('$resource.$subResource').addParams({ include: { path: { pick: { subResource: { /*subResourceValues*/ } } } } });
      pages.forPaths('$resource.$subResource').addParams({ include: { path: { pick: { subResource: { managers: { /*subResourceChildren*/ } } } } } });
      pages.forPaths('users.managers.$subResource').addParams({ include: { path: { pick: { subResource: { /*scopedChildren*/ } } } } });
      pages.forPaths('$resource.$component').addParams({ include: { path: { pick: { component: { /*componentValues*/ } } } } });
      pages.forPaths('$resource.$subResource').addParams({ include: { /*builder*/ } });
      pages.forPaths('$resource.$subResource').addParams({ include: { path: true, /*builderPopulated*/ } });
      pages.forPaths('$resource.$subResource').addParams({ include: { path: { /*builderPath*/ } } });
      pages.forPaths('$resource.$subResource').addParams({ include: { keys: { /*builderKeys*/ } } });
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
      const keyCompletions = service.getCompletionsAtPosition(
        file,
        source.indexOf('/*factoryKeys*/'),
        {},
      );
      expect(keyCompletions?.entries.map(({ name }) => name).sort()).toEqual([
        '*',
        'component',
      ]);

      for (const [marker, expected] of Object.entries({
        factoryOptions: ['component', 'params', 'props'],
        factoryParams: ['count'],
        wildcardProps: ['label'],
        singleProps: ['label'],
        objectProps: ['label'],
        optionalWildcardProps: ['label'],
        optionalSingleProps: ['label'],
        params: ['include', 'custom'],
        empty: ['path', 'keys'],
        populated: ['keys'],
        keysFirst: ['path'],
        path: ['optional', 'pick'],
        keys: ['optional'],
        factory: ['path', 'keys'],
        rendererPick: ['resource', 'subResource'],
        rendererPickPopulated: ['subResource'],
        builderPick: ['resource', 'subResource'],
        scopedPick: ['subResource'],
        componentPick: ['resource', 'component'],
        resourceValues: ['users'],
        resourceChildren: ['admins', 'managers', 'detail'],
        resourceGrandchildren: ['female'],
        subResourceValues: ['admins', 'managers'],
        subResourceChildren: ['female'],
        scopedChildren: ['female'],
        componentValues: ['component'],
        builder: ['path', 'keys'],
        builderPopulated: ['keys'],
        builderPath: ['optional', 'pick'],
        builderKeys: ['optional'],
      })) {
        const completions = service.getCompletionsAtPosition(
          file,
          source.indexOf(`/*${marker}*/`),
          {},
        );
        expect({
          marker,
          isMemberCompletion: completions?.isMemberCompletion,
        }).toEqual({
          marker,
          isMemberCompletion: true,
        });
        expect({
          marker,
          names: completions?.entries
            .filter(
              (entry) =>
                entry.kind !== ts.ScriptElementKind.memberFunctionElement,
            )
            .map(({ name }) => name)
            .sort(),
        }).toEqual({
          marker,
          names: expected.sort(),
        });
      }
    } finally {
      service.dispose();
    }
  },
  30_000,
);
