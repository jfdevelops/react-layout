import { StrictMode, createElement } from 'react';
import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-breadcrumb';
import { act, render, screen } from '@testing-library/react';
import { expectTypeOf, expect, it } from 'vitest';
import { getInspectionSource } from '@jfdevelops/react-layout-devtools-core';
import {
  createDefinedResourceLayout,
  defineResourceLayout,
  defineLayoutName,
  createProp,
  defineComposableComponent,
} from '../../src';

const naming = defineLayoutName(
  ({ resource, capitalize }, parts) =>
    `${parts.prefix}${capitalize(resource)}${parts.beforeSuffix}ResourceLayout${
      parts.append
    }`
);

it('narrows default naming to the selected resource and supports optional variations', () => {
  const factory = createDefinedResourceLayout({
    resources: ['settings', 'users'],
    name: naming(),
  });
  const definition = factory.defineResourceLayout({
    render: { default: () => <p>Ready</p>, Loading: () => <p>Loading</p> },
  });
  const Settings = definition.createResourceLayout({ resource: 'settings' });
  expectTypeOf(Settings.displayName).toEqualTypeOf<'SettingsResourceLayout'>();
  expect(Settings.displayName).toBe('SettingsResourceLayout');
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: naming({
      prefix: 'Admin',
      beforeSuffix: 'Detail',
      append: 'Preview',
    }),
  });
  expectTypeOf(
    Users.displayName
  ).toEqualTypeOf<'AdminUsersDetailResourceLayoutPreview'>();
  expect(Users.displayName).toBe('AdminUsersDetailResourceLayoutPreview');
  const Inline = definition.createResourceLayout({
    resource: 'users',
    name: ({ resource, states, capitalize }) => {
      expectTypeOf(resource).toEqualTypeOf<'users'>();
      expectTypeOf(states).toEqualTypeOf<readonly ('default' | 'Loading')[]>();
      return `${capitalize(resource)}Inline`;
    },
  });
  expectTypeOf(Inline.displayName).toEqualTypeOf<'UsersInline'>();
  expect(Inline.displayName).toBe('UsersInline');
});

it('requires an explicit name without a naming default', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: { render: () => <></> },
  });
  () => {
    // @ts-expect-error no naming default
    definition.createResourceLayout({ resource: 'users' });
  };
});

it('merges factory props and local overrides by key', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: { title: createProp.string(), subtitle: createProp.string() },
    props: { include: { title: true, subtitle: 'optional' } },
  });
  const definition = factory.defineResourceLayout({
    props: {
      include: { title: { visibility: 'required', passthrough: 'component' } },
    },
    render: () => <p>Content</p>,
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  expectTypeOf(Users).toBeCallableWith({ title: 'Users' });
  () => {
    // @ts-expect-error title has moved to the component boundary
    Users({});
  };
  render(<Users title="Users" />);
  expect(screen.getByText('Content')).toBeTruthy();
});

it('collects factory definitions and tracks mounted state instances after opening an inspector', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const definition = factory.defineResourceLayout({
    render: { default: () => <p>Ready</p>, Loading: () => <p>Loading</p> },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const view = render(
    <>
      <Users.Loading />
      <Users.Loading />
    </>
  );
  const source = getInspectionSource(factory);
  const loading = () =>
    source
      .getSnapshot()
      .nodes.find((n) => n.kind === 'state' && n.label === 'Loading')!;
  expect(loading().active).toBe(2);
  let notifications = 0;
  const stop = source.subscribe(() => notifications++);
  act(() => view.rerender(<Users />));
  expect(loading().active).toBe(0);
  expect(
    source
      .getSnapshot()
      .nodes.find((n) => n.kind === 'state' && n.label === 'default')?.active
  ).toBe(1);
  expect(notifications).toBeGreaterThan(0);
  stop();
  view.unmount();
  expect(source.getSnapshot().nodes.every((n) => n.active === 0)).toBe(true);
});

it('exposes globally included props in inline states and separately created states', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: { title: createProp.string(), count: createProp.number() },
    props: { include: { title: true, count: 'optional' } },
  });
  const Loading = factory.createRenderState({
    state: 'Loading',
    render: ({ title, count }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(count).toEqualTypeOf<number | undefined>();
      return (
        <p>
          {title}: {count}
        </p>
      );
    },
  });
  const definition = factory.defineResourceLayout({
    render: {
      default: ({ title, count }) => {
        expectTypeOf(title).toEqualTypeOf<string>();
        expectTypeOf(count).toEqualTypeOf<number | undefined>();
        return <p>{title}</p>;
      },
      ...Loading,
      Preview: {
        props: {
          include: {
            title: { visibility: 'required', passthrough: 'component' },
          },
        },
        render: ({ title, count }) => {
          expectTypeOf(title).toEqualTypeOf<string>();
          expectTypeOf(count).toEqualTypeOf<number | undefined>();
          return <p>{title}</p>;
        },
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
  });
  expectTypeOf(Users.Preview).toBeCallableWith({ title: 'Preview' });
  const view = render(<Users />);
  expect(screen.getByText('Users')).toBeTruthy();
  view.rerender(<Users.Preview title="Preview" />);
  expect(screen.getByText('Preview')).toBeTruthy();
});

it('uses the naming context when computing call-site variations', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    name: naming(),
  });
  const definition = factory.defineResourceLayout({ render: () => <></> });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: naming(({ resource, capitalize }) => ({
      prefix: `${capitalize(resource)}Admin` as const,
    })),
  });
  expectTypeOf(
    Users.displayName
  ).toEqualTypeOf<'UsersAdminUsersResourceLayout'>();
  expect(Users.displayName).toBe('UsersAdminUsersResourceLayout');
});

it('supports standalone naming defaults and per-definition replacements', () => {
  const definition = defineResourceLayout({
    resources: ['users', 'settings'],
    name: naming(),
    layout: { render: () => <></> },
  });
  const Users = definition.createResourceLayout({ resource: 'users' });
  expectTypeOf(Users.displayName).toEqualTypeOf<'UsersResourceLayout'>();
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    name: naming(),
  });
  const local = factory.defineResourceLayout({
    name: naming({ append: 'Local' }),
    render: () => <></>,
  });
  const Local = local.createResourceLayout({ resource: 'users' });
  expectTypeOf(Local.displayName).toEqualTypeOf<'UsersResourceLayoutLocal'>();
  expect(Local.displayName).toBe('UsersResourceLayoutLocal');
});

it('shows explicit state references without executing render callbacks', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  let renders = 0;
  const definition = factory.defineResourceLayout({
    composables: (_create, states) => ({ Pending: states.Loading }),
    render: {
      default: () => {
        renders++;
        return <></>;
      },
      Loading: () => <p>Loading</p>,
    },
  });
  definition.createResourceLayout({ resource: 'users', name: 'Users' });
  const graph = getInspectionSource(factory).getSnapshot();
  expect(renders).toBe(0);
  const reference = graph.nodes.find(
    (n) => n.kind === 'composable' && n.label === 'Pending'
  )!;
  expect(
    graph.edges.some(
      (e) => e.source === reference.id && e.relationship === 'references'
    )
  ).toBe(true);
});

it('registers lazy declarations and resolves their metadata after loading', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const LazyUsers = factory.defineResourceLayout.lazy({
    resource: 'users',
    load: async () => {
      const definition = factory.defineResourceLayout({
        render: () => <p>Lazy users</p>,
      });
      return {
        Users: definition.createResourceLayout({
          resource: 'users',
          name: 'LazyUsers',
        }),
      };
    },
  });
  const source = getInspectionSource(factory);
  expect(
    source.getSnapshot().nodes.find((n) => n.kind === 'lazy')?.unresolved
  ).toBe(true);
  const view = render(<LazyUsers />);
  await screen.findByText('Lazy users');
  expect(
    source.getSnapshot().nodes.find((n) => n.kind === 'lazy')?.unresolved
  ).toBe(false);
  expect(
    source.getSnapshot().nodes.filter((n) => n.kind === 'layout')
  ).toHaveLength(1);
  view.unmount();
});

it('allows breadcrumb segments to be configured once as global component passthrough', () => {
  const breadcrumbComposable = createBreadcrumbComposable(({ segments }) => (
    <nav>
      {Object.entries(segments).map(([key, segment]) => (
        <span key={key}>
          {typeof segment === 'string' ? segment : segment.value}
        </span>
      ))}
    </nav>
  ));
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: createProp.component({ type: 'ReactNode' }),
      description: createProp.component({ type: 'ReactNode' }).optional(),
    },
    composables: (create) => ({
      Layout: create({
        name: ({ capitalize, resource }) => `${capitalize(resource)}Layout`,
        wrapWith: 'main',
      }),
      ...breadcrumbComposable,
      Header: create({
        name: ({ capitalize, resource }) => `${capitalize(resource)}Header`,
        wrapWith: 'header',
      }),
    }),
    props: {
      include: {
        segments: { visibility: 'optional', passthrough: 'component' },
      },
    },
  });
  const definition = factory.defineResourceLayout({
    render: (_props, { composables }) => (
      <composables.Layout>
        <composables.Header>
          <composables.Breadcrumb
            segments={{ users: { value: 'Users', isActive: true } }}
          />
        </composables.Header>
      </composables.Layout>
    ),
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  expectTypeOf(Users).toBeCallableWith({});
  render(<Users />);
  expect(screen.getByRole('navigation').textContent).toBe('Users');
});

it('allows conventions to inspect resource values and preserves raw resource names', () => {
  const raw = defineLayoutName(({ resource }) => `${resource}Layout`);
  const definition = defineResourceLayout({
    resources: ['users'],
    name: raw(),
    layout: { render: () => <></> },
  });
  const Users = definition.createResourceLayout({ resource: 'users' });
  expectTypeOf(Users.displayName).toEqualTypeOf<'usersLayout'>();
  const conditional = defineLayoutName(({ resource, capitalize }, parts) =>
    resource === 'users'
      ? `${parts.prefix}${capitalize(resource)}Users`
      : `${capitalize(resource)}Other`
  );
  const Named = definition.createResourceLayout({
    resource: 'users',
    name: conditional(({ resource }) => ({
      prefix: resource === 'users' ? 'Admin' : '',
    })),
  });
  expect(Named.displayName).toBe('AdminUsersUsers');
});

it('preserves explicit name/resource generic arguments', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: { render: () => <></> },
  });
  const Users = definition.createResourceLayout<'Users', 'users'>({
    resource: 'users',
    name: 'Users',
  });
  expectTypeOf(Users.displayName).toEqualTypeOf<'Users'>();
});

it('infers an inline resource name without a const assertion', () => {
  const definition = defineResourceLayout({
    resources: ['users', 'settings'],
    layout: { render: () => <></> },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: ({ resource, capitalize }) => `${capitalize(resource)}Page`,
  });
  expectTypeOf(Users.displayName).toEqualTypeOf<'UsersPage'>();
  expect(Users.displayName).toBe('UsersPage');
});

it('renders real validator schemas as human-readable types in inspection details', async () => {
  const { formatInspectionDetails } = await import(
    '@jfdevelops/react-layout-devtools-core'
  );
  const details = JSON.parse(
    formatInspectionDetails({
      props: {
        children: createProp.component({ type: 'ReactNode' }),
        className: createProp.string().optional(),
        status: createProp.string().enum(['draft', 'published']),
        role: createProp.string().literal('admin'),
        user: createProp.object({
          name: createProp.string(),
          age: createProp.number().optional(),
        }),
        segments: createProp.record({
          value: createProp.string().or(
            createProp.object({
              value: createProp.string(),
              isActive: createProp.boolean().optional(),
            })
          ),
        }),
        element: createProp
          .component({ type: 'JSX.Element' })
          .props({ title: createProp.string() }),
      },
    })
  );
  expect(details.props).toEqual({
    children: 'ReactNode (required)',
    className: 'string (optional)',
    status: '"draft" | "published" (required)',
    role: '"admin" (required)',
    user: '{ name: string; age?: number } (required)',
    segments:
      'Record<string, string | { value: string; isActive?: boolean }> (required)',
    element: 'JSX.Element<{ title: string }> (required)',
  });
});

it('counts actual composable instances and excludes unrendered declarations', () => {
  const Item = defineComposableComponent({
    name: 'Item',
    props: { label: createProp.string().optional() },
  })(({ label }) => <span>{label}</span>);
  const Hidden = defineComposableComponent({
    name: 'Hidden',
    props: { label: createProp.string().optional() },
  })(({ label }) => <span>{label}</span>);
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    composables: () => ({ ...Item, ...Hidden }),
  });
  const definition = factory.defineResourceLayout({
    render: (_props, { composables }) => (
      <>
        <composables.Item label="First item" />
        <composables.Item label="Second item" />
      </>
    ),
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    label: 'Fallback',
  });
  const count = (label: string) =>
    getInspectionSource(factory)
      .getSnapshot()
      .nodes.filter(
        (node) => node.kind === 'composable' && node.label === label
      )
      .reduce((total, node) => total + node.active, 0);
  expect(count('Item')).toBe(0);
  const view = render(
    <StrictMode>
      <Users />
    </StrictMode>
  );
  expect(screen.getByText('First item')).toBeTruthy();
  expect(screen.getByText('Second item')).toBeTruthy();
  expect(count('Item')).toBe(2);
  expect(count('Hidden')).toBe(0);
  view.rerender(
    <StrictMode>
      <Users />
      <Users />
    </StrictMode>
  );
  expect(count('Item')).toBe(4);
  view.rerender(
    <StrictMode>
      <Users />
    </StrictMode>
  );
  expect(count('Item')).toBe(2);
  view.unmount();
  expect(count('Item')).toBe(0);
});

it('forwards merged factory layout and default-state custom props through scoped Root', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    props: { custom: { factoryValue: createProp.string() } },
  });
  const definition = factory.defineResourceLayout({
    props: { custom: { layoutValue: createProp.string() } },
    render: {
      default: {
        props: { custom: { stateValue: createProp.string().optional() } },
        render: ({ factoryValue, layoutValue, stateValue }) => (
          <h1>
            {factoryValue}:{layoutValue}:{stateValue}
          </h1>
        ),
      },
    },
  });
  const Directory = definition.createResourceLayout
    .forResources('users')
    .createComponent({
      props: {
        include: {
          factoryValue: true,
          layoutValue: true,
          stateValue: 'optional',
        },
      },
      resources: { users: { render: () => null } },
      render: (_props, { Root }) => createElement(Root),
    });
  render(
    <Directory
      resource="users"
      factoryValue="Factory"
      layoutValue="Layout"
      stateValue="State"
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Factory:Layout:State' })
  ).toBeTruthy();
});
