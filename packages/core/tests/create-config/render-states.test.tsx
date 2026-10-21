import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDefinedResourceLayout,
  createComposableComponent,
  createProp,
  defineResourceLayout,
} from '../../src';

describe('resource layout render states', () => {
  afterEach(cleanup);

  it('reuses options defined by the chained builder in render states', () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout('users').defineOptions({
        message: createProp.string(),
      });
    const Loading = createRenderState({
      state: 'Loading',
      props: { include: { message: true } },
      render: ({ message }) => <p>{message}</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      layout: {
        render: {
          default: () => <></>,
          ...Loading,
        },
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
      createDefinedResourceLayout('users');
    const Loading = createRenderState.defer({
      state: 'Loading',
      render: () => <p>Deferred loading</p>,
    });
    const { createResourceLayout } = defineBoundLayout({
      layout: {
        render: {
          default: () => <h1>Users</h1>,
          ...Loading,
        },
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Loading />);

    expect(await screen.findByText('Deferred loading')).toBeInTheDocument();
  });

  it('renders deferred and lazy created states as the default component', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout('users');
    const deferredDefinition = defineBoundLayout({
      layout: {
        render: {
          ...createRenderState.defer(() => <p>Deferred default</p>),
        },
      },
    });
    const DeferredUsers = deferredDefinition.createResourceLayout({
      resource: 'users',
      name: 'DeferredUsers',
    });
    const lazyDefault = createRenderState(() => <p>Lazy default</p>);
    const lazyDefinition = defineBoundLayout({
      layout: {
        render: {
          default: createRenderState.lazy(async () => ({ lazyDefault })),
          Loading: () => <p>Loading default</p>,
        },
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
      createDefinedResourceLayout('users');
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
      layout: {
        render: {
          default: () => <p>Target</p>,
          ...Preview,
        },
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
      createDefinedResourceLayout('users');
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
      layout: {
        render: {
          default: () => <h1>Users</h1>,
          Audit: createRenderState.lazy(async () => ({
            auditState,
          })),
        },
      },
    });
    const Users = createResourceLayout({ resource: 'users', name: 'Users' });

    render(<Users.Audit label='Audit log' />);

    expect(await screen.findByText('Audit log')).toBeInTheDocument();
  });

  it('uses configured Loading while an imported state is suspended', async () => {
    const { createRenderState, defineResourceLayout: defineBoundLayout } =
      createDefinedResourceLayout('users');
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
      layout: {
        render: {
          default: () => <h1>Users</h1>,
          Loading: () => <p>Loading audit</p>,
          Audit: createRenderState.lazy(() => stateModule),
        },
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
      createDefinedResourceLayout('users');
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
      layout: {
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
    const suite = createDefinedResourceLayout('users');
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

  it('retries a failed lazy resource import with the configured error state', async () => {
    const created = defineResourceLayout({
      resources: ['users'],
      layout: { render: () => <h1>Recovered users</h1> },
    });
    const LoadedUsers = created.createResourceLayout({
      resource: 'users',
      name: 'LoadedUsers',
    });
    const suite = createDefinedResourceLayout('users');
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
