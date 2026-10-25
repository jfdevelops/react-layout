import { expect, it } from 'vitest';
import ts from 'typescript';
import { reactLayoutDevtools } from '../src';

async function transform(code: string, id = '/app/src/page.tsx', ssr = false) {
  const plugin = reactLayoutDevtools();
  if (typeof plugin.configResolved === 'function')
    Reflect.apply(plugin.configResolved, {}, [
      { root: '/app', base: '/demo/' },
    ]);
  if (typeof plugin.transform !== 'function')
    throw new Error('Missing transform');
  return (await Reflect.apply(plugin.transform, {}, [code, id, { ssr }])) as
    | { code: string; map: { sourcesContent: string[] } }
    | undefined;
}
it('instruments aliases, factory helpers, inline states and imported state spreads with sourcemaps', async () => {
  const code = `import { createDefinedResourceLayout as create } from '@jfdevelops/react-layout';
const factory = create({ resources: ['users'] });
const { defineResourceLayout: define, createRenderState: state } = create({ resources: ['posts'] });
const loading = state({ state: 'Loading', render: () => null });
const definition = define({ render: { ...loading, default: () => null } });
const Page = definition.createResourceLayout({ name: 'Page', resource: 'posts' });`;
  const result = await transform(code);
  expect(result?.code).toContain('virtual:react-layout-devtools');
  expect(result?.code).toContain('"file":"src/page.tsx"');
  expect(result?.code).toContain('"line":6');
  expect(result?.code).toContain('/demo/__open-in-editor');
  expect(result?.map.sourcesContent).toEqual([code]);
  const compiled = ts.transpileModule(result!.code, {
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ESNext,
    },
  });
  expect(compiled.diagnostics).toHaveLength(0);
});
it('handles shorthand state entries and leaves strings and comments alone', async () => {
  const result = await transform(`import { defineResourceLayout } from './base';
const Loading = () => null;
const text = 'defineResourceLayout({})'; // defineResourceLayout({})
const def = defineResourceLayout({ render: { Loading, default: () => null } });`);
  expect(result?.code).toContain('Loading: __reactLayoutDebug(Loading,');
  expect(result?.code).toContain("'defineResourceLayout({})'");
  expect(result?.code).toContain('// defineResourceLayout({})');
});
it('skips SSR, dependency files and unrelated APIs and applies only during development', async () => {
  const code = `import { defineResourceLayout } from '@jfdevelops/react-layout'; defineResourceLayout({});`;
  expect(await transform(code, '/app/src/server.ts', true)).toBeUndefined();
  expect(
    await transform(code, '/app/node_modules/library/index.ts')
  ).toBeUndefined();
  expect(
    await transform(
      'const defineResourceLayout = (x) => x; defineResourceLayout({});'
    )
  ).toBeUndefined();
  expect(reactLayoutDevtools().apply).toBe('serve');
});
it('preserves existing declaration metadata when an imported state is registered elsewhere', () => {
  const plugin = reactLayoutDevtools();
  if (typeof plugin.load !== 'function') throw new Error('Missing runtime');
  const runtime = Reflect.apply(plugin.load, {}, [
    '\0virtual:react-layout-devtools',
  ]) as string;
  const annotate = new Function(
    runtime.replace('export function annotate', 'function annotate') +
      '; return annotate;'
  )();
  const key = Symbol.for('@jfdevelops/react-layout/debug');
  const declaration = {
    source: { file: 'state.ts', line: 1, column: 1 },
    preview: true,
  };
  const value = annotate({ render: () => null }, declaration);
  const registered = annotate(value, {
    source: { file: 'layout.ts', line: 5, column: 1 },
  });
  expect(registered[key].source.file).toBe('state.ts');
  expect(value).toBe(registered);
});

it('follows destructured definition helpers and resource-bound creators', async () => {
  const result =
    await transform(`import { defineResourceLayout } from '@jfdevelops/react-layout';
const define = defineResourceLayout.forResources('users');
const definition = define({ layout: { render: () => null } });
const { createResourceLayout } = definition;
const createUsers = createResourceLayout.forResource({ resource: 'users' });
const Page = createUsers({ name: 'Users' });`);
  expect(result?.code).toContain('createUsers(__reactLayoutDebug(');
  expect(result?.code).toContain('"line":6');
});
it('does not instrument calls to a shadowing function parameter', async () => {
  const result =
    await transform(`import { defineResourceLayout } from '@jfdevelops/react-layout';
function unrelated(defineResourceLayout) { return defineResourceLayout({}); }`);
  expect(result).toBeUndefined();
});

it('preserves module directives and can opt out of state controls', async () => {
  const plugin = reactLayoutDevtools({ statePreview: false });
  const code = `'use client';\nimport { defineResourceLayout } from '@jfdevelops/react-layout';\ndefineResourceLayout({});`;
  if (typeof plugin.transform !== 'function')
    throw new Error('Missing transform');
  const result = (await Reflect.apply(plugin.transform, {}, [
    code,
    '/app/client.ts',
    {},
  ])) as { code: string };
  expect(result.code.startsWith("'use client';")).toBe(true);
  expect(result.code).toContain('"preview":false');
});

it('preserves function and frozen state-reference identities while supplying metadata', () => {
  const plugin = reactLayoutDevtools();
  if (typeof plugin.load !== 'function') throw new Error('Missing runtime');
  const runtime = Reflect.apply(plugin.load, {}, [
    '\0virtual:react-layout-devtools',
  ]) as string;
  const annotate = new Function(
    runtime.replace('export function annotate', 'function annotate') +
      '; return annotate;'
  )();
  const input = Object.freeze({ render: () => null });
  const render = () => null;
  const metadata = { source: { file: 'state.ts', line: 1, column: 1 } };
  expect(annotate(input, metadata)).toBe(input);
  expect(annotate(render, metadata)).toBe(render);
  const registry = (
    globalThis as unknown as Record<symbol, WeakMap<object, unknown>>
  )[Symbol.for('@jfdevelops/react-layout/debug-registry')];
  expect(registry.get(input)).toEqual(metadata);
});
