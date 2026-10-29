import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { getInspectionSource } from '@jfdevelops/react-layout-devtools-core';
import { createDefinedResourceLayout } from '../../src';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it.each(['intrinsic', 'fragment', 'composable', 'unwrapped'] as const)(
  'marks existing %s roots for their layout and state without wrappers',
  (root) => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      composables: (create) => ({
        Root: create({ name: 'Root', wrapWith: 'main' }),
        Plain: create({ name: 'Plain' }),
      }),
    });
    const Users = factory
      .defineResourceLayout({
        render: (_, { composables }) =>
          root === 'intrinsic' ? (
            <main>Users</main>
          ) : root === 'fragment' ? (
            <>
              <main>Users</main>
              <aside>Sidebar</aside>
            </>
          ) : root === 'composable' ? (
            <composables.Root>Users</composables.Root>
          ) : (
            <composables.Plain>
              <main>Users</main>
            </composables.Plain>
          ),
      })
      .createResourceLayout({ resource: 'users', name: 'Users' });
    const view = render(<Users />);
    const graph = getInspectionSource(factory).getSnapshot();
    const layout = graph.nodes.find(
      (node) => node.kind === 'layout' && node.label === 'Users'
    )!;
    const state = graph.nodes.find(
      (node) => node.kind === 'state' && node.active > 0
    )!;
    expect(view.container.children).toHaveLength(root === 'fragment' ? 2 : 1);
    for (const element of Array.from(view.container.children)) {
      const owners = JSON.parse(element.getAttribute('data-rl-owners')!);
      expect(owners).toContain(layout.id);
      expect(owners).toContain(state.id);
    }
  }
);

it('does not add root inspection attributes in production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Users = factory
    .defineResourceLayout({ render: () => <main>Users</main> })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  const view = render(<Users />);
  expect(view.container.querySelector('[data-rl-owners]')).toBeNull();
  expect(view.container.innerHTML).toBe('<main>Users</main>');
});

it('marks the actual Loading and Error state roots with their own state ids', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Users = factory
    .defineResourceLayout({
      render: {
        ...factory.createRenderState({
          state: 'default',
          render: () => <main>Ready</main>,
        }),
        ...factory.createRenderState({
          state: 'Loading',
          render: () => <p>Loading</p>,
        }),
        ...factory.createRenderState({
          state: 'Error',
          render: () => <p>Failed</p>,
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  const view = render(<Users.Loading />);
  for (const [State, label] of [
    [Users.Loading, 'Loading'],
    [Users.Error, 'Error'],
  ] as const) {
    view.rerender(<State />);
    const graph = getInspectionSource(factory).getSnapshot();
    const state = graph.nodes.find(
      (node) => node.kind === 'state' && node.label === label && node.active > 0
    )!;
    expect(
      JSON.parse(
        view.container.firstElementChild!.getAttribute('data-rl-owners')!
      )
    ).toContain(state.id);
  }
});
