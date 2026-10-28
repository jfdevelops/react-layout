import { lazyStatesSymbol } from '../../src/lazy/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  createDefinedResourceLayout,
  createComposableComponent,
  createProp,
  defineResourceLayout,
  ResourceModuleLoadError,
} from '../../src';

describe('resource layout render states', () => {
  afterEach(cleanup);

  it('allows states reusing required children props to render without children', () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const Layout = createRenderState({
      state: 'Layout',
      props: { custom: { children: createProp.component({ type: 'ReactNode' }) } },
      render: ({ children }) => <main>{children}</main>,
    });
    const state = (name: 'Loading' | 'Error' | 'NotFound') => createRenderState({
      state: name,
      props: Layout.Layout.props,
      render: ({ children }) => <p>{children ?? name}</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <></>,
        ...state('Loading'),
        ...state('Error'),
        ...state('NotFound'),
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });
    for (const State of [Users.Loading, Users.Error, Users.NotFound]) {
      expectTypeOf<React.ComponentProps<typeof State>>().toMatchTypeOf<{ children?: React.ReactNode }>();
      const view = render(<State />);
      expect(view.container.textContent).toMatch(/Loading|Error|NotFound/);
      view.unmount();
    }
    render(<Users.Loading>Provided children</Users.Loading>);
    expect(screen.getByText('Provided children')).toBeInTheDocument();
  });

  it('allows lazy route states and library fallbacks to omit inherited children', async () => {
    const factory = createDefinedResourceLayout({ resources: ['users'] });
    const props = { custom: { children: createProp.component({ type: 'ReactNode' }) } };
    const { createResourceLayout } = factory.defineResourceLayout({
      render: {
        default: () => <p>Ready</p>,
        ...factory.createRenderState({ state: 'Loading', props, render: () => <p>Pending</p> }),
        ...factory.createRenderState({ state: 'Error', props, render: () => <p>Failed</p> }),
        ...factory.createRenderState({ state: 'NotFound', props, render: () => <p>Missing</p> }),
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });
    const Page = factory.defineResourceLayout.lazy({ resource: 'users', load: async () => ({ Users }) });
    await Page.preload();
    for (const State of [Page.Loading, Page.Error, Page.NotFound]) {
      const view = render(<State />);
      expect(await screen.findByText(/Pending|Failed|Missing/)).toBeInTheDocument();
      view.unmount();
    }
    const fallbacks = (Users as unknown as { [lazyStatesSymbol]: import('../../src/lazy/types').LazyResourceStates })[lazyStatesSymbol];
    const Loading = fallbacks.Loading!;
    const view = render(<Loading resource="users" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    view.unmount();
    const ErrorFallback = fallbacks.Error!;
    render(<ErrorFallback resource="users" error={new ResourceModuleLoadError('users', 'offline')} retry={() => {}} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('types omitted children as optional in derived state render callbacks', () => {
    const factory = createDefinedResourceLayout({ resources: ['users'] });
    const Source = factory.createRenderState({
      state: 'Layout',
      render: () => <></>,
    });
    const ErrorState = factory.createRenderState.fromState({
      ref: Source,
      state: 'Error',
      props: { custom: { children: createProp.string() } },
      render: ({ children }) => {
        expectTypeOf(children).toEqualTypeOf<string | undefined>();
        return <p>{children ?? 'No derived children'}</p>;
      },
    });
    const Users = factory.defineResourceLayout({
      render: { default: () => <></>, ...ErrorState },
    }).createResourceLayout({ resource: 'users', name: 'Users' });
    render(<Users.Error />);
    expect(screen.getByText('No derived children')).toBeInTheDocument();
  });

  it.each([true, false])('preserves config-only children when required is %s', (required) => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      options: { children: createProp.component({ type: 'ReactNode' }).optional() },
    });
    const Loading = factory.createRenderState({
      state: 'Loading',
      props: { include: { children: { required, suppliedVia: 'config' } } },
      render: ({ children }) => <p>{children ?? 'No configured children'}</p>,
    });
    const layout = factory.defineResourceLayout({ render: { default: () => <></>, ...Loading } });
    const Users = layout.createResourceLayout({ resource: 'users', name: 'Users', children: 'Configured children' });
    const callProps = { children: 'Component override' };
    const view = render(<Users.Loading {...callProps} />);
    expect(screen.getByText('Configured children')).toBeInTheDocument();
    expect(screen.queryByText('Component override')).not.toBeInTheDocument();
    view.unmount();
    const Empty = layout.createResourceLayout({ resource: 'users', name: 'Empty' });
    render(<Empty.Loading />);
    expect(screen.getByText('No configured children')).toBeInTheDocument();
    () => {
      // @ts-expect-error config-only children are not component props
      <Users.Loading children="Unexpected" />;
    };
  });

  it('keeps component-supplied children available after optionalizing includes', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      options: { children: createProp.component({ type: 'ReactNode' }).optional() },
    });
    const Loading = factory.createRenderState({
      state: 'Loading',
      props: { include: { children: { required: true, suppliedVia: 'component' } } },
      render: ({ children }) => <p>{children ?? 'No component children'}</p>,
    });
    const Users = factory.defineResourceLayout({
      render: { default: () => <></>, ...Loading },
    }).createResourceLayout({ resource: 'users', name: 'Users' });
    const view = render(<Users.Loading />);
    expect(screen.getByText('No component children')).toBeInTheDocument();
    view.rerender(<Users.Loading>Component children</Users.Loading>);
    expect(screen.getByText('Component children')).toBeInTheDocument();
  });

  it('preserves config-only children declared with shorthand includes', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      options: { children: createProp.component({ type: 'ReactNode' }).optional() },
    });
    const Loading = factory.createRenderState({
      state: 'Loading',
      props: { include: { children: true } },
      render: ({ children }) => <p>{children}</p>,
    });
    const Users = factory.defineResourceLayout({ render: { default: () => <></>, ...Loading } })
      .createResourceLayout({ resource: 'users', name: 'Users', children: 'Configured shorthand' });
    const callProps = { children: 'Unexpected override' };
    render(<Users.Loading {...callProps} />);
    expect(screen.getByText('Configured shorthand')).toBeInTheDocument();
  });

  it('uses the same normalized resources accessor as global definitions', () => {
    const { resources } = createDefinedResourceLayout({
      resources: [
        'users',
        { value: 'posts', subResources: ['comments'] },
      ],
    });

    expect(resources()).toEqual([
      { value: 'users' },
      {
        value: 'posts',
        subResources: [{ value: 'comments' }],
      },
    ]);
    expect(resources.raw()).toEqual([
      'users',
      { value: 'posts', subResources: ['comments'] },
    ]);
    expect(resources.pick('posts')()).toEqual([
      { value: 'posts', subResources: ['comments'] },
    ]);
  });

  it('reuses factory options in render states', () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({
        resources: ['users'],
        options: { message: createProp.string() },
      });
    const Loading = createRenderState({
      state: 'Loading',
      props: { include: { message: true } },
      render: ({ message }) => <p>{message}</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <></>,
        ...Loading,
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      message: 'Loading from defined options',
    });

    render(<Users.Loading />);

    expect(screen.getByText('Loading from defined options')).toBeInTheDocument();
  });

  it('passes factory composables to the render state context', () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({
        resources: ['users'],
        composables: (create) => ({
          Layout: create({ name: 'Layout' }),
          Content: create({ name: 'Content' }),
        }),
      });
    const Loading = createRenderState({
      state: 'Loading',
      render: (_, { composables }) => {
        expectTypeOf(composables).toHaveProperty('Layout');
        expectTypeOf(composables).toHaveProperty('Content');
        expect(Object.keys(composables)).toEqual(['Layout', 'Content']);

        return (
          <composables.Layout>
            <composables.Content>Loading users</composables.Content>
          </composables.Layout>
        );
      },
    });
    const { createResourceLayout } = defineBoundLayout({
      render: { default: () => <></>, ...Loading },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Loading />);

    expect(screen.getByText('Loading users')).toBeInTheDocument();
  });

  it('attaches independently configured states to the default component', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        message: createProp.string(),
      },
      layout: {
        render: {
          default: {
            props: { include: { title: true } },
            render: ({ title }) => <h1>{title}</h1>,
          },
          Loading: {
            props: { include: { message: true } },
            render: ({ message }) => <p>{message}</p>,
          },
          NotFound: () => <p>Missing</p>,
        },
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      title: 'Users',
      message: 'Loading users',
    });

    render(
      <>
        <Users />
        <Users.Loading />
        <Users.NotFound />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Loading users')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
  });

  it('validates custom props declared by the object-form default state', () => {
    const definition = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: {
          default: {
            props: {
              custom: {
                label: createProp.string(),
              },
            },
            render: ({ label }) => <p>{label}</p>,
          },
        },
      },
    });
    const Users = definition.createResourceLayout({
      resource: 'users',
      name: 'Users',
    });

    render(<Users label='Default state label' />);

    expect(screen.getByText('Default state label')).toBeInTheDocument();
  });

  it('creates reusable and deferred state fragments', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const Loading = createRenderState.defer({
      state: 'Loading',
      render: () => <p>Deferred loading</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <h1>Users</h1>,
        ...Loading,
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Loading />);

    expect(await screen.findByText('Deferred loading')).toBeInTheDocument();
  });

  it('renders deferred and lazy created states as the default component', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const deferredDefinition = defineBoundLayout({
      render: {
        ...createRenderState.defer(() => <p>Deferred default</p>),
      },
    });
    const DeferredUsers = deferredDefinition.createResourceLayout({
      resource: 'users',
      name: 'DeferredUsers',
    });
    const lazyDefault = createRenderState(() => <p>Lazy default</p>);
    const lazyDefinition = defineBoundLayout({
      render: {
        default: createRenderState.lazy(async () => ({ lazyDefault })),
        Loading: () => <p>Loading default</p>,
      },
    });
    const LazyUsers = lazyDefinition.createResourceLayout({
      resource: 'users',
      name: 'LazyUsers',
    });

    render(
      <>
        <DeferredUsers />
        <LazyUsers />
      </>,
    );

    expect(await screen.findByText('Deferred default')).toBeInTheDocument();
    expect(await screen.findByText('Lazy default')).toBeInTheDocument();
  });

  it('lifts runtime prop definitions from created components', () => {
    const first = defineResourceLayout({
      resources: ['users'],
      layout: {
        props: {
          custom: {
            title: createProp.string(),
            count: createProp.number().optional(),
          },
        },
        render: ({ title }) => <h1>{title}</h1>,
      },
    });
    const Source = first.createResourceLayout({
      resource: 'users',
      name: 'Source',
    });
    const lifted = createProp.fromComponent(Source).pick('title');
    const second = defineResourceLayout({
      resources: ['users'],
      layout: {
        props: { custom: lifted },
        render: ({ title }) => <p>{title}</p>,
      },
    });
    const Target = second.createResourceLayout({
      resource: 'users',
      name: 'Target',
    });

    render(<Target title='Lifted title' />);

    expect(screen.getByText('Lifted title')).toBeInTheDocument();
  });

  it('uses created state components as state-local composables', () => {
    const sourceDefinition = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: {
          default: () => <p>Source</p>,
          Loading: () => <p>Shared loading state</p>,
        },
      },
    });
    const Source = sourceDefinition.createResourceLayout({
      resource: 'users',
      name: 'Source',
    });
    const { createRenderState, defineResourceLayout: defineTargetLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const Preview = createRenderState({
      state: 'Preview',
      composables: () => ({
        Layout: createComposableComponent({ name: 'TargetLayout' }),
        Loading: Source.Loading,
      }),
      render: (_props, { composables }) => (
        <composables.Layout>
          <composables.Loading />
        </composables.Layout>
      ),
    });
    const targetDefinition = defineTargetLayout({
      render: {
        default: () => <p>Target</p>,
        ...Preview,
      },
    });
    const Target = targetDefinition.createResourceLayout({
      resource: 'users',
      name: 'Target',
    });

    render(<Target.Preview />);

    expect(screen.getByText('Shared loading state')).toBeInTheDocument();
  });

  it('rejects state names that collide with component statics', () => {
    const definition = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: {
          default: () => <div />,
          props: () => <div />,
        },
      },
    } as never);

    expect(() =>
      definition.createResourceLayout({
        resource: 'users',
        name: 'Users',
      }),
    ).toThrowError('Render state name "props" is reserved');
  });

  it('loads a separately chunked render state from its named module export', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const auditState = createRenderState({
      state: 'Audit',
      props: {
        custom: {
          label: createProp.string(),
        },
      },
      render: ({ label }) => <p>{label}</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <h1>Users</h1>,
        Audit: createRenderState.lazy(async () => ({
          auditState,
        })),
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Audit label='Audit log' />);

    expect(await screen.findByText('Audit log')).toBeInTheDocument();
  });

  it('uses configured Loading while an imported state is suspended', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const auditState = createRenderState({
      state: 'Audit',
      render: () => <p>Audit loaded</p>,
    });
    let resolveStateModule!: (module: { auditState: typeof auditState }) => void;
    const stateModule = new Promise<{ auditState: typeof auditState }>(
      (resolve) => {
        resolveStateModule = resolve;
      },
    );
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <h1>Users</h1>,
        Loading: () => <p>Loading audit</p>,
        Audit: createRenderState.lazy(() => stateModule),
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Audit />);
    expect(screen.getByText('Loading audit')).toBeInTheDocument();

    resolveStateModule({ auditState });
    expect(await screen.findByText('Audit loaded')).toBeInTheDocument();
  });

  it('exposes retry in an automatic Error state context', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout({ resources: ['users'] });
    const ErrorState = createRenderState({
      state: 'Error',
      props: {
        custom: {
          error: createProp.object({ message: createProp.string() }),
        },
      },
      render: (_props, { retry }) => (
        <button type='button' onClick={retry}>
          Retry audit
        </button>
      ),
    });
    const auditState = createRenderState({
      state: 'Audit',
      render: () => <p>Retried audit</p>,
    });
    let loadCount = 0;
    const { createResourceLayout } = defineBoundLayout({
      render: {
        default: () => <h1>Users</h1>,
        ...ErrorState,
        Audit: createRenderState.lazy(async () => {
          loadCount += 1;

          if (loadCount === 1) {
            throw new Error('audit download failed');
          }

          return { auditState };
        }),
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Audit />);
    fireEvent.click(await screen.findByText('Retry audit'));

    expect(await screen.findByText('Retried audit')).toBeInTheDocument();
    expect(loadCount).toBe(2);
  });

  it('renders the configured Error state for default render failures', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const definition = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: {
          default: () => {
            throw new Error('render failed');
          },
          Error: {
            props: {
              custom: {
                error: createProp.object({
                  message: createProp.string(),
                }),
              },
            },
            render: ({ error }) => (
              <p>{((error as Error).cause as Error).message}</p>
            ),
          },
        },
      },
    });
    const Users = definition.createResourceLayout({
      resource: 'users',
      name: 'Users',
    });

    render(<Users />);

    expect(screen.getByText('render failed')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('lazy loads an entire created component and exposes proxied states', async () => {
    const created = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: {
          default: () => <h1>Lazy users</h1>,
          NotFound: () => <p>Lazy users missing</p>,
        },
      },
    });
    const LoadedUsers = created.createResourceLayout({
      resource: 'users',
      name: 'LoadedUsers',
    });
    const suite = createDefinedResourceLayout({ resources: ['users'] });
    suite.defineLazyDefaults({
      Loading: () => <p>Loading resource code</p>,
    });
    let loadCount = 0;
    const Users = suite.defineResourceLayout.lazy({
      resource: 'users',
      load: async () => {
        loadCount += 1;
        return { LoadedUsers };
      },
    });

    const lazyStatics = Users as unknown as Record<PropertyKey, unknown>;
    expect(lazyStatics.resource).toBeUndefined();
    expect(lazyStatics.props).toBeUndefined();

    render(
      <>
        <Users />
        <Users.NotFound />
      </>,
    );

    expect(await screen.findByText('Lazy users')).toBeInTheDocument();
    expect(await screen.findByText('Lazy users missing')).toBeInTheDocument();
    expect(loadCount).toBe(1);
  });

  it.each(['default', 'named'] as const)('lazy loads a namespace from a %s module export', async (exportName) => {
    const suite = createDefinedResourceLayout({ resources: ['users'], namespace: true });
    const definition = suite.defineResourceLayout({
      render: {
        default: {
          props: { custom: { title: createProp.string() } },
          render: ({ title }) => <h1>{title}</h1>,
        },
        Detail: {
          props: { custom: { count: createProp.number() } },
          render: ({ count }) => <p>Detail {count}</p>,
        },
      },
    });
    const LoadedUsers = definition.createResourceLayout({ resource: 'users', name: 'LoadedUsers' });
    const load = vi.fn(async () => ({ [exportName]: LoadedUsers, unrelated: { Root: () => null } }));
    const Users = suite.defineResourceLayout.lazy({ resource: 'users', load });

    expectTypeOf(Users).toBeCallableWith({ title: 'Namespace users' });
    expectTypeOf(Users.Detail).toBeCallableWith({ count: 2 });
    () => {
      // @ts-expect-error lazy namespace roots retain required props
      <Users />;
      // @ts-expect-error lazy namespace states retain required props
      <Users.Detail />;
      // @ts-expect-error only declared states are exposed
      Users.Unknown;
    };
    render(<><Users title='Namespace users' /><Users.Detail count={2} /></>);
    expect(await screen.findByText('Namespace users')).toBeInTheDocument();
    expect(await screen.findByText('Detail 2')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('retries a failed lazy resource import with the configured error state', async () => {
    const created = defineResourceLayout({
      resources: ['users'],
      layout: { render: () => <h1>Recovered users</h1> },
    });
    const LoadedUsers = created.createResourceLayout({
      resource: 'users',
      name: 'LoadedUsers',
    });
    const suite = createDefinedResourceLayout({ resources: ['users'] });
    suite.defineLazyDefaults({
      Error: ({ retry }) => (
        <button type='button' onClick={retry}>
          Retry resource code
        </button>
      ),
    });
    let loadCount = 0;
    const Users = suite.defineResourceLayout.lazy({
      resource: 'users',
      load: async () => {
        loadCount += 1;

        if (loadCount === 1) {
          throw new Error('download failed');
        }

        return { LoadedUsers };
      },
    });

    render(<Users />);
    fireEvent.click(await screen.findByText('Retry resource code'));

    expect(await screen.findByText('Recovered users')).toBeInTheDocument();
    expect(loadCount).toBe(2);
  });
});
