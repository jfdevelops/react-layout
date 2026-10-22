// @vitest-environment node
import * as ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it.each(['empty', 'populated'])('suggests state names in %s render objects across every API', (stage) => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const file = `${root}/tests/create-config/autocomplete-probe.tsx`;
  const source = `
    import { defineResourceLayout, createDefinedResourceLayout, createProp } from '../../src';
    const { defineResourceLayout: bound } = createDefinedResourceLayout({ resources: ['users'], options: { title: createProp.string() } });
    defineResourceLayout({ resources: ['users'], layout: { render: { /*top*/ } } });
    bound({ render: { /*bound*/ } });
    defineResourceLayout.forResources('users')({ layout: { render: { /*resources*/ } } });
    defineResourceLayout.withLayout({
      resources: ['users'], shell: { render: () => <></> },
      layout: { render: { /*shell*/ } },
    });
    const namespaceDefinition = defineResourceLayout({ resources: ['users'], namespace: true, layout: {
      render: { default: () => <></>, Preview: () => <></> },
    } });
    const Users = namespaceDefinition.createResourceLayout({ resource: 'users', name: 'Users' });
    const namespaceElement = <Users./*namespaceMembers*/ />;
    bound({ props: { include: { title: true }, custom: { count: createProp.number() } }, render: ({ /*functionProps*/ }) => <></> });
    defineResourceLayout({ resources: ['users'], layout: {
      composables: (_create, states) => ({ Other: states./*topStates*/ }),
      render: { default: () => <></>, Preview: () => <></> },
    } });
    bound({
      composables: (_create, states) => ({ Other: states./*boundStates*/ }),
      render: { default: () => <></>, Preview: () => <></> },
    });
    defineResourceLayout.forResources('users')({ layout: {
      composables: (_create, states) => ({ Other: states./*resourceStates*/ }),
      render: { default: () => <></>, Preview: () => <></> },
    } });
    defineResourceLayout.withLayout({ resources: ['users'], shell: { render: () => <></> }, layout: {
      composables: (_create, states) => ({ Other: states./*shellStates*/ }),
      render: { default: () => <></>, Preview: () => <></> },
    } });
  `.replace(/\/\*(top|bound|resources|shell)\*\//g,
    (marker) => stage === 'populated' ? `default: () => <></>, ${marker}` : marker);
  const config = ts.readConfigFile(`${root}/tsconfig.json`, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const service = ts.createLanguageService({
    getScriptFileNames: () => [file],
    getScriptVersion: () => '1',
    getScriptSnapshot: (name) => {
      const contents = name === file ? source : ts.sys.readFile(name);
      return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
    },
    getCurrentDirectory: () => root,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  });

  try {
    for (const marker of ['top', 'bound', 'resources', 'shell']) {
      const completions = service.getCompletionsAtPosition(
        file, source.indexOf(`/*${marker}*/`), {},
      );
      const names = completions?.entries.map(({ name }) => name);
      expect(names, marker).toEqual(
        expect.arrayContaining(stage === 'empty'
          ? ['default', 'Loading', 'Error', 'NotFound']
          : ['Loading', 'Error', 'NotFound']),
      );
      expect(names, marker).not.toEqual(expect.arrayContaining(['apply', 'bind', 'call']));
    }
    for (const marker of ['topStates', 'boundStates', 'resourceStates', 'shellStates']) {
      const entries = service.getCompletionsAtPosition(file, source.indexOf(`/*${marker}*/`), {});
      const names = entries?.entries.map(({ name }) => name);
      expect(names, marker).toEqual(expect.arrayContaining(['default', 'Preview']));
      expect(names, marker).not.toContain('Loading');
    }
    const namespaceMembers = service.getCompletionsAtPosition(
      file, source.indexOf('/*namespaceMembers*/'), {},
    );
    expect(namespaceMembers?.entries.map(({ name }) => name).sort()).toEqual(['Preview', 'Root']);
    const functionProps = service.getCompletionsAtPosition(
      file, source.indexOf('/*functionProps*/'), {},
    );
    expect(functionProps?.entries.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['title', 'count']),
    );
  } finally {
    service.dispose();
  }
}, 30_000);
