import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  getInspectionSource,
  layoutDebug,
} from '@jfdevelops/react-layout-devtools-core';
import {
  createDefinedResourceLayout,
  createProp,
  defineLayoutPreview,
} from '../../src';

afterEach(cleanup);

function setup(enabled = true) {
  const factory = createDefinedResourceLayout(
    Object.assign(
      { resources: ['users'] as const },
      {
        [layoutDebug]: {
          preview: enabled,
          source: { file: 'base.ts', line: 1, column: 1 },
        },
      }
    )
  );
  const definition = factory.defineResourceLayout({
    render: {
      default: () => <p>Automatic</p>,
      ...factory.createRenderState({
        state: 'Loading',
        render: () => <p>Loading preview</p>,
      }),
      ...factory.createRenderState({
        state: 'Empty',
        props: { custom: { message: createProp.string() } },
        render: ({ message }) => <p>{message}</p>,
      }),
    },
  });
  const Page = definition.createResourceLayout({
    name: 'Users',
    resource: 'users',
  });

  return { factory, Page, source: getInspectionSource(factory) };
}

it('previews a declared render state for only the chosen mounted instance and restores Auto', () => {
  const { Page, source } = setup();
  const release = source.connectPreview!();
  const view = render(
    <StrictMode>
      <Page />
      <Page />
    </StrictMode>
  );
  const instances = source.getSnapshot().instances!;

  expect(instances).toHaveLength(2);

  const loading = source
    .getSnapshot()
    .nodes.find((node) => node.label === 'Loading')!;

  act(() => source.preview!(instances[0].id, loading.id));

  expect(screen.getAllByText('Automatic')).toHaveLength(1);

  expect(screen.getByText('Loading preview')).toBeTruthy();

  expect(
    source.getSnapshot().nodes.find((node) => node.id === loading.id)?.active
  ).toBe(1);

  act(() => release());

  expect(screen.queryByText('Loading preview')).toBeNull();

  expect(screen.getAllByText('Automatic')).toHaveLength(2);

  view.unmount();

  expect(source.getSnapshot().instances).toHaveLength(0);
});

it('accepts typed preview fixtures and leaves automatic rendering untouched', () => {
  const { Page, source } = setup();

  defineLayoutPreview(Page, { Empty: { message: 'No records' } });

  () => {
    // @ts-expect-error fixtures must match the state component props
    defineLayoutPreview(Page, { Empty: { message: 42 } });

    // @ts-expect-error unknown states are rejected
    defineLayoutPreview(Page, { Missing: {} });
  };

  render(<Page />);

  const state = source
    .getSnapshot()
    .nodes.find((node) => node.label === 'Empty')!;

  act(() => source.preview!(source.getSnapshot().instances![0].id, state.id));

  expect(screen.getByText('No records')).toBeTruthy();

  act(() => source.preview!(source.getSnapshot().instances![0].id));

  expect(screen.getByText('Automatic')).toBeTruthy();
});

it('contains missing preview props and permits recovery through Auto', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    const { Page, source } = setup();

    render(<Page />);

    const instance = source.getSnapshot().instances![0];
    const state = source
      .getSnapshot()
      .nodes.find((node) => node.label === 'Empty')!;

    act(() => source.preview!(instance.id, state.id));

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to preview');

    expect(source.getSnapshot().instances![0].error).toBeTruthy();

    act(() => source.preview!(instance.id));

    expect(screen.getByText('Automatic')).toBeTruthy();
  } finally {
    log.mockRestore();
  }
});

it('does not expose preview capabilities without opt-in', () => {
  const { Page, source } = setup(false);

  render(<Page />);

  expect(source.getSnapshot().instances).toHaveLength(0);
});

it('preserves source locations for definitions, resources, layouts and states', () => {
  const { source } = setup();

  for (const node of source
    .getSnapshot()
    .nodes.filter((node) => node.kind !== 'composable')) {
    expect(node.source?.file).toBe('base.ts');
  }
});

it('supports namespace roots, explicit state mounts and shared typed fixtures', () => {
  const factory = createDefinedResourceLayout(
    Object.assign(
      { resources: ['users'] as const, namespace: true as const },
      { [layoutDebug]: { preview: true } }
    )
  );
  const definition = factory.defineResourceLayout({
    render: {
      default: () => <p>Default namespace</p>,
      ...factory.createRenderState({
        state: 'Empty',
        props: { custom: { message: createProp.string() } },
        render: ({ message }) => <p>{message}</p>,
      }),
    },
  });
  const Page = definition.createResourceLayout({
    name: 'Namespace',
    resource: 'users',
  });

  defineLayoutPreview(Page, { Empty: { message: 'Namespace fixture' } });

  const view = render(<Page.Root />);
  const source = getInspectionSource(factory);

  act(() =>
    source.preview!(
      source.getSnapshot().instances![0].id,
      source.getSnapshot().nodes.find((node) => node.label === 'Empty')!.id
    )
  );

  expect(screen.getByText('Namespace fixture')).toBeTruthy();

  view.unmount();

  render(<Page.Empty message="Explicit state" />);

  expect(screen.getByText('Explicit state')).toBeTruthy();

  act(() =>
    source.preview!(
      source.getSnapshot().instances![0].id,
      source
        .getSnapshot()
        .nodes.find(
          (node) => node.kind === 'state' && node.label === 'default'
        )!.id
    )
  );

  expect(screen.getByText('Default namespace')).toBeTruthy();
});

it('preserves imported state declarations separately from registration and page locations', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const state = factory.createRenderState(
    Object.assign(
      { state: 'Loading' as const, render: () => <p>Imported</p> },
      {
        [layoutDebug]: {
          source: { file: 'states/loading.tsx', line: 3, column: 1 },
        },
      }
    )
  );
  const definition = factory.defineResourceLayout(
    Object.assign(
      { render: { default: () => <p>Default</p>, ...state } },
      { [layoutDebug]: { source: { file: 'layout.tsx', line: 8, column: 1 } } }
    )
  );

  definition.createResourceLayout(
    Object.assign(
      { name: 'Users', resource: 'users' as const },
      { [layoutDebug]: { source: { file: 'page.tsx', line: 10, column: 1 } } }
    )
  );

  const graph = getInspectionSource(factory).getSnapshot();

  expect(graph.nodes.find((node) => node.kind === 'layout')?.source?.file).toBe(
    'page.tsx'
  );

  expect(
    graph.nodes.find((node) => node.label === 'Loading')?.source?.file
  ).toBe('states/loading.tsx');

  expect(
    graph.nodes.find((node) => node.label === 'Loading')?.registrationSource
      ?.file
  ).toBe('layout.tsx');
});

it('can preview deferred states and return control to the mounted default', async () => {
  const factory = createDefinedResourceLayout(
    Object.assign(
      { resources: ['users'] as const },
      { [layoutDebug]: { preview: true } }
    )
  );
  const definition = factory.defineResourceLayout({
    render: {
      default: () => <p>Normal content</p>,
      ...factory.createRenderState.defer({
        state: 'Loading',
        render: () => <p>Deferred preview</p>,
      }),
    },
  });
  const Page = definition.createResourceLayout({
    name: 'Deferred',
    resource: 'users',
  });

  render(<Page />);

  const source = getInspectionSource(factory);
  const instance = source.getSnapshot().instances![0];

  await act(async () =>
    source.preview!(
      instance.id,
      source.getSnapshot().nodes.find((node) => node.label === 'Loading')!.id
    )
  );

  expect(await screen.findByText('Deferred preview')).toBeTruthy();

  act(() => source.preview!(instance.id));

  expect(screen.getByText('Normal content')).toBeTruthy();
});
