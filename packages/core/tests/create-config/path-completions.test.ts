// @vitest-environment node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as TypeScript from 'typescript-6';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);

it.each(['typescript-5-9', 'typescript-6'])(
  'completes resource paths one segment at a time with %s',
  (compiler) => {
    const ts: typeof TypeScript = require(compiler);
    const root = resolve(
      fileURLToPath(new URL('../..', import.meta.url)),
    ).replaceAll('\\', '/');
    const file = `${root}/tests/create-config/path-completions-probe.tsx`;
    const entry =
      process.env.REACT_LAYOUT_TYPE_ENTRY === 'dist'
        ? '../../dist/index.mjs'
        : '../../src';
    const probe = `
      import { defineResourceLayout } from '${entry}';
      const { createResourceConfig } = defineResourceLayout({
        resources: [{ value: 'users', subResources: [{ value: 'managers', subResources: ['female'] }] }, 'trash'],
        layout: { render: () => <main /> },
      });
      const pages = createResourceConfig({
        users: { component: <main />, managers: { component: <main />, female: { component: <main /> } } },
        trash: { component: <main />, pendingComponent: <main /> },
      });
      const renderer = pages.createRenderer({
        render: ({ getComponentForPath }) => { getComponentForPath('users./*getter*/'); return null; },
        displayName: ({ path }) => {
          path.is('/*guardRoot*/');
          path.is('users./*guardChild*/');
          path.is('users.managers./*guardDeep*/');
          path.capitalize('/*capitalizeRoot*/');
          path.capitalize('users./*capitalizeChild*/');
          if (path.is('users')) { path.is('users.managers./*guardNarrowed*/'); }
          return path.value;
        },
      });
      renderer('/*rendererRoot*/');
      renderer('users./*rendererChild*/');
      const selectedUsers = renderer('users');
      selectedUsers.forResource('/*resourceRoot*/');
      selectedUsers.forResource('managers./*resourceDeep*/');
      renderer.forPath('users.managers./*scope*/');
      const usersRenderer = renderer.forPath('users');
      usersRenderer('managers./*relative*/');
      pages.createGetComponent('users.managers./*createGetter*/');
      pages.getComponent('users.managers./*getComponent*/');
      pages.forPaths('users.managers./*forPaths*/');
      pages.forPaths('trash', 'users.managers./*secondPath*/');
      pages.isSubResourceKey('female', { path: 'users.managers./*subResourceGuard*/' });
      pages.forPaths('users.managers.female').render(({ getComponentForPath }) => {
        getComponentForPath('users.managers./*boundGetter*/'); return null;
      });
    `;
    const source = probe.replace(/\/\*\w+\*\//g, '');
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
      const expected = {
        guardRoot: ['users', 'trash', '$resource'],
        capitalizeRoot: ['users', 'trash', '$resource', '*'],
        capitalizeChild: ['users.managers', 'users.$subResource'],
        guardChild: ['users.managers', 'users.$subResource'],
        guardDeep: ['users.managers.female'],
        guardNarrowed: ['users.managers.female'],
        rendererRoot: ['users', 'trash', '$resource'],
        rendererChild: ['users.managers', 'users.$subResource'],
        resourceRoot: ['managers', '$subResource'],
        resourceDeep: ['managers.female'],
        scope: ['users.managers.female'],
        relative: ['managers.female'],
        boundGetter: ['users.managers.female'],
      };

      for (const marker of [
        ...Object.keys(expected),
        'getter',
        'createGetter',
        'getComponent',
        'forPaths',
        'secondPath',
        'subResourceGuard',
      ]) {
        const before = probe
          .slice(0, probe.indexOf(`/*${marker}*/`))
          .replace(/\/\*\w+\*\//g, '');
        const prefix = before.slice(before.lastIndexOf("'") + 1);
        const completions = service.getCompletionsAtPosition(
          file,
          before.length,
          {},
        );
        const names = completions?.entries
          .map(({ name }) => name)
          .filter((name) => name.startsWith(prefix))
          .sort();
        const exact = expected[marker as keyof typeof expected];

        // TypeScript 5.9 does not infer the edited prefix inside an options object.
        const hasLegacyObjectCompletion =
          marker === 'subResourceGuard' && compiler === 'typescript-5-9';
        const requiredNames = expect.arrayContaining([
          `${prefix}${marker === 'getter' ? 'managers' : 'female'}`,
        ]);
        const expectedNames = hasLegacyObjectCompletion
          ? ['$resource', 'trash', 'users']
          : (exact?.sort() ?? requiredNames);
        const actualNames = hasLegacyObjectCompletion
          ? completions?.entries.map(({ name }) => name).sort()
          : names;
        expect({
          marker,
          names: actualNames,
        }).toEqual({
          marker,
          names: expectedNames,
        });
        expect(
          hasLegacyObjectCompletion ||
            names?.every((name) => !name.slice(prefix.length).includes('.')),
        ).toBe(true);
      }
    } finally {
      service.dispose();
    }
  },
  30_000,
);
