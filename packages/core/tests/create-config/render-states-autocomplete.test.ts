// @vitest-environment node
import * as ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it.each(['empty', 'populated'])('suggests state and include keys in %s objects across every API', (stage) => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const file = `${root}/tests/create-config/autocomplete-probe.tsx`;
  const source = `
    import { defineResourceLayout, createDefinedResourceLayout, createProp } from '../../src';
    import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-breadcrumb';
    const AdminLayout = ({ children }: { children?: import('react').ReactNode }) => <main>{children}</main>;
    const breadcrumb = createBreadcrumbComposable(({ segments }) => <nav>{Object.keys(segments).join(',')}</nav>);
    const { defineResourceLayout: shared, createRenderState, defineLazyDefaults, resources } = createDefinedResourceLayout({
      resources: ['users', { value: 'builder', subResources: ['homepage'] }],
      options: {
        title: createProp.component({ type: 'ReactNode' }),
        description: createProp.component({ type: 'ReactNode' }).optional(),
      },
      composables: (create) => ({
        Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }),
        ...breadcrumb,
        Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }),
      }),
      props: { include: { /*sharedInclude*/ } },
    });
    const { defineResourceLayout: bound } = createDefinedResourceLayout({ resources: ['users'], options: { title: createProp.string() } });
    bound({ composables: (create) => ({ Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }), ...breadcrumb, Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }) }), props: { include: { /*localFunctionInclude*/ } }, render: () => <></> });
    bound({ composables: (create) => ({ Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }), ...breadcrumb, Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }) }), props: { include: { /*localStatesInclude*/ } }, render: { default: () => <></> } });
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
  `.replace(/\/\*(sharedInclude|localFunctionInclude|localStatesInclude)\*\//g,
    (marker) => stage === 'populated' ? `title: true, ${marker}` : marker).replace(/\/\*(top|bound|resources|shell)\*\//g,
    (marker) => stage === 'populated' ? `default: () => <></>, ${marker}` : marker);
  const breadcrumbFile = `${root}/tests/create-config/devtools-and-defaults.test.tsx`;
  const breadcrumbTest = readFileSync(breadcrumbFile, 'utf8');
  const testStart = breadcrumbTest.indexOf("it('allows breadcrumb segments");
  const includeStart = breadcrumbTest.indexOf('include: {', testStart) + 'include: {'.length;
  const includeEnd = breadcrumbTest.indexOf('\n      },', includeStart);
  const breadcrumbSource = breadcrumbTest.slice(0, includeStart)
    + (stage === 'populated' ? 'title: true, ' : '')
    + '/*breadcrumbInclude*/' + breadcrumbTest.slice(includeEnd);
  const config = ts.readConfigFile(`${root}/tsconfig.json`, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const service = ts.createLanguageService({
    getScriptFileNames: () => [file, breadcrumbFile],
    getScriptVersion: () => '1',
    getScriptSnapshot: (name) => {
      const contents = name === file ? source : name === breadcrumbFile ? breadcrumbSource : ts.sys.readFile(name);
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
    service.getSemanticDiagnostics(breadcrumbFile);
    const breadcrumbEntries = service.getCompletionsAtPosition(
      breadcrumbFile, breadcrumbSource.indexOf('/*breadcrumbInclude*/'), {},
    );
    expect(breadcrumbEntries?.entries.map(({ name }) => name), 'actual breadcrumb test').toEqual(
      expect.arrayContaining(stage === 'empty' ? ['title', 'description', 'segments'] : ['description', 'segments']),
    );
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
    for (const marker of ['sharedInclude', 'localFunctionInclude', 'localStatesInclude']) {
      const completions = service.getCompletionsAtPosition(file, source.indexOf(`/*${marker}*/`), {});
      expect(completions?.entries.map(({ name }) => name), marker).toEqual(
        expect.arrayContaining(stage === 'empty' ? ['title', 'segments'] : ['segments']),
      );
    }
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
