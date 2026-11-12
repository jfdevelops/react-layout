// @vitest-environment node
import * as ts from 'typescript-6';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it.each(['empty', 'populated'])(
  'suggests state and include keys in %s objects across every API',
  (stage) => {
    const root = resolve(fileURLToPath(new URL('../..', import.meta.url))).replaceAll('\\', '/');
    const file = `${root}/tests/create-config/autocomplete-probe.tsx`;
    const source = `
    import { z } from 'zod';
    import { reactNode } from '@jfdevelops/react-layout-adapter-zod';
    import { defineResourceLayout, createDefinedResourceLayout } from '../../src';
    import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-breadcrumb';
    const AdminLayout = ({ children }: { children?: import('react').ReactNode }) => <main>{children}</main>;
    const breadcrumb = createBreadcrumbComposable(({ segments }) => <nav>{Object.keys(segments).join(',')}</nav>);
    const { defineResourceLayout: shared, createRenderState, defineLazyDefaults, resources } = createDefinedResourceLayout({
      resources: ['users', { value: 'builder', subResources: ['homepage'] }],
      options: {
        title: reactNode(),
        description: reactNode().optional(),
      },
      composables: (create) => ({
        Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }),
        ...breadcrumb,
        Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }),
      }),
      props: { include: { /*sharedInclude*/ } },
    });
    const { defineResourceLayout: bound } = createDefinedResourceLayout({ resources: ['users'], options: { title: z.string() } });
    bound({ composables: (create) => ({ Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }), ...breadcrumb, Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }) }), props: { include: { /*localFunctionInclude*/ } }, render: () => <></> });
    bound({ composables: (create) => ({ Layout: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Layout', wrapWith: AdminLayout }), ...breadcrumb, Header: create({ name: ({ capitalize, resource }) => capitalize(resource) + 'Header', wrapWith: AdminLayout }) }), props: { include: { /*localStatesInclude*/ } }, render: { default: () => <></> } });
    bound({ props: { include: { title: { /*includeBehavior*/ } } }, render: () => <></> });
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
    bound({ props: { include: { title: true }, custom: { count: z.number() } }, render: ({ /*functionProps*/ }) => <></> });
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
  `
      .replace(/\/\*(sharedInclude|localFunctionInclude|localStatesInclude)\*\//g, (marker) =>
        stage === 'populated' ? `title: true, ${marker}` : marker,
      )
      .replace(/\/\*(top|bound|resources|shell)\*\//g, (marker) =>
        stage === 'populated' ? `default: () => <></>, ${marker}` : marker,
      );
    const breadcrumbFile = `${root}/tests/create-config/devtools-and-defaults.test.tsx`;
    const breadcrumbTest = readFileSync(breadcrumbFile, 'utf8');
    const testStart = breadcrumbTest.indexOf("it('allows breadcrumb segments");
    const includeStart = breadcrumbTest.indexOf('include: {', testStart) + 'include: {'.length;
    const includeEnd = breadcrumbTest.indexOf('\n      },', includeStart);
    const breadcrumbSource =
      breadcrumbTest.slice(0, includeStart) +
      (stage === 'populated' ? 'title: true, ' : '') +
      '/*breadcrumbInclude*/' +
      breadcrumbTest.slice(includeEnd);
    const config = ts.readConfigFile(`${root}/tsconfig.json`, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const normalized = (name: string) => name.replaceAll('\\', '/');
    const isProbe = (name: string) => normalized(name) === file;
    const isBreadcrumb = (name: string) => normalized(name) === breadcrumbFile;
    const service = ts.createLanguageService({
      getScriptFileNames: () => [file, breadcrumbFile],
      getScriptVersion: () => '1',
      getScriptSnapshot: (name) => {
        const contents = isProbe(name)
          ? source
          : isBreadcrumb(name)
            ? breadcrumbSource
            : ts.sys.readFile(name);

        return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => root,
      getCompilationSettings: () => parsed.options,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: (name) => isProbe(name) || isBreadcrumb(name) || ts.sys.fileExists(name),
      readFile: (name) =>
        isProbe(name) ? source : isBreadcrumb(name) ? breadcrumbSource : ts.sys.readFile(name),
      readDirectory: ts.sys.readDirectory,
    });

    try {
      service.getSemanticDiagnostics(breadcrumbFile);
      const breadcrumbEntries = service.getCompletionsAtPosition(
        breadcrumbFile,
        breadcrumbSource.indexOf('/*breadcrumbInclude*/'),
        {},
      );
      expect(
        breadcrumbEntries?.entries.map(({ name }) => name),
        'actual breadcrumb test',
      ).toEqual(
        expect.arrayContaining(
          stage === 'empty' ? ['title', 'description', 'segments'] : ['description', 'segments'],
        ),
      );
      for (const marker of ['top', 'bound', 'resources', 'shell']) {
        const completions = service.getCompletionsAtPosition(
          file,
          source.indexOf(`/*${marker}*/`),
          {},
        );
        const names = completions?.entries.map(({ name }) => name);
        expect(names, marker).toEqual(
          expect.arrayContaining(
            stage === 'empty'
              ? ['default', 'Loading', 'Error', 'NotFound']
              : ['Loading', 'Error', 'NotFound'],
          ),
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
        file,
        source.indexOf('/*namespaceMembers*/'),
        {},
      );
      expect(namespaceMembers?.entries.map(({ name }) => name).sort()).toEqual(['Preview', 'Root']);
      for (const marker of ['sharedInclude', 'localFunctionInclude', 'localStatesInclude']) {
        const completions = service.getCompletionsAtPosition(
          file,
          source.indexOf(`/*${marker}*/`),
          {},
        );
        expect(
          completions?.entries.map(({ name }) => name),
          marker,
        ).toEqual(expect.arrayContaining(stage === 'empty' ? ['title', 'segments'] : ['segments']));
      }
      const behaviorEntries = service.getCompletionsAtPosition(
        file,
        source.indexOf('/*includeBehavior*/'),
        {},
      )?.entries;
      expect(behaviorEntries?.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['required', 'suppliedVia']),
      );
      for (const name of ['visibility', 'passthrough']) {
        expect(behaviorEntries?.map((entry) => entry.name)).not.toContain(name);
      }
      const functionProps = service.getCompletionsAtPosition(
        file,
        source.indexOf('/*functionProps*/'),
        {},
      );
      expect(functionProps?.entries.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['title', 'count']),
      );
    } finally {
      service.dispose();
    }
  },
  30_000,
);
