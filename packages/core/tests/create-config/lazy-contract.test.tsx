import {
  Component,
  StrictMode,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import { getInspectionSource } from '@jfdevelops/react-layout-devtools-core';
import {
  createDefinedResourceLayout,
  createProp,
  isLazyResourceError,
  LayoutConfigurationError,
  LazyResourceModuleShapeError,
  LazyResourceStateNotFoundError,
  ResourceModuleLoadError,
  type LazyHandle,
  type LazyOptions,
  type LazyResourceError,
  type LazyResourceErrorProps,
} from '../../src';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Kind = 'resource' | 'state' | 'scoped';
function fixture(
  kind: Kind,
  options: {
    load?: (
      module: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
    fallback?: ReactNode;
    nearest?: boolean;
    defaults?: boolean;
    content?: () => ReactNode;
  } = {},
) {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  if (options.defaults !== false)
    factory.defineLazyDefaults({
      Loading: ({ resource }) => <p>Global loading {resource}</p>,
      Error: ({ error, retry, resource }) => (
        <>
          <p>
            {resource}:{error.code}
          </p>
          <button onClick={retry}>Retry</button>
        </>
      ),
    });
  const Content = options.content ?? (() => <p>Loaded content</p>);
  const state = factory.createRenderState({
    state: 'Detail',
    render: () => <Content />,
  });
  const created = factory.defineResourceLayout({ render: () => <Content /> });
  const Page = created.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const module =
    kind === 'resource' ? { Page } : kind === 'state' ? { state } : { Content };
  const load = vi.fn(() =>
    options.load ? options.load(module) : Promise.resolve(module),
  );
  const lazyOptions: LazyOptions = { load, fallback: options.fallback };
  let View: ComponentType<any>;
  let handle: LazyHandle;
  if (kind === 'resource') {
    const result = factory.defineResourceLayout.lazy({
      resource: 'users',
      ...lazyOptions,
    });
    View = result as unknown as ComponentType<any>;
    handle = result;
  } else if (kind === 'state') {
    const result = factory.createRenderState.lazy(lazyOptions);
    handle = result;
    const definition = factory.defineResourceLayout({
      render: {
        default: () => <p>Shell</p>,
        ...(options.nearest ? { Loading: () => <p>Nearest loading</p> } : {}),
        Detail: result,
      },
    });
    View = definition.createResourceLayout({
      resource: 'users',
      name: 'UsersDetail',
    }).Detail;
  } else {
    const definition = factory.defineResourceLayout({
      render: {
        default: () => <p>Shell</p>,
        ...(options.nearest ? { Loading: () => <p>Nearest loading</p> } : {}),
      },
    });
    const scope = definition.createResourceLayout.forResources('users');
    const entry = scope.createResourceComponents({
      resource: 'users',
      lazy: lazyOptions,
    });
    const Shell = scope.createComponent({
      resources: { users: entry },
      render: (_, ctx) => <ctx.Users />,
    });
    const Bound = Shell.asHOF()('users');
    View = Bound;
    handle = Bound;
  }
  return { factory, View, handle, load, source: getInspectionSource(factory) };
}

describe.each<Kind>(['resource', 'state', 'scoped'])(
  '%s shared lazy contract',
  (kind) => {
    it('caches preload and rendering, and reports declaration, loading, resolution and mounts', async () => {
      let finish!: () => void;
      const gate = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const { View, handle, load, source } = fixture(kind, {
        load: async (module) => {
          await gate;
          return module;
        },
      });
      expect(handle.status).toBe('unresolved');
      expect(
        source
          .getSnapshot()
          .nodes.some(
            (node) => node.kind === 'lazy' && node.status === 'unresolved',
          ),
      ).toBe(true);
      if (kind === 'scoped') {
        const graph = source.getSnapshot();
        const lazy = graph.nodes.find((node) => node.kind === 'lazy')!;
        expect(
          graph.edges.some(
            (edge) =>
              edge.target === lazy.id &&
              graph.nodes.some(
                (node) => node.id === edge.source && node.kind === 'component',
              ),
          ),
        ).toBe(true);
      }
      const first = handle.preload();
      const second = handle.preload();
      expect(second).toBe(first);
      render(<View />);
      expect(handle.status).toBe('loading');
      expect(screen.getByText('Global loading users')).toBeInTheDocument();
      expect(
        source
          .getSnapshot()
          .nodes.some(
            (node) =>
              node.kind === 'lazy' &&
              node.status === 'loading' &&
              node.active > 0,
          ),
      ).toBe(true);
      await act(async () => {
        finish();
        await first;
        await second;
      });
      expect(await screen.findByText('Loaded content')).toBeInTheDocument();
      expect(load).toHaveBeenCalledTimes(1);
      expect(handle.status).toBe('resolved');
      expect(
        source
          .getSnapshot()
          .nodes.some(
            (node) =>
              node.kind === 'lazy' &&
              node.status === 'resolved' &&
              !node.unresolved,
          ),
      ).toBe(true);
      cleanup();
      expect(
        source
          .getSnapshot()
          .nodes.filter((node) => node.kind === 'lazy')
          .every((node) => node.active === 0),
      ).toBe(true);
    });

    it('uses an explicit fallback before global defaults', async () => {
      const { View } = fixture(kind, {
        fallback: <p>Explicit fallback</p>,
        load: () => new Promise(() => undefined),
      });
      render(<View />);
      expect(screen.getByText('Explicit fallback')).toBeInTheDocument();
      expect(screen.queryByText('Global loading users')).toBeNull();
    });

    it('uses null for an explicit empty fallback and when no Loading UI exists', () => {
      const explicit = fixture(kind, {
        fallback: null,
        load: () => new Promise(() => undefined),
      });
      const view = render(<explicit.View />);
      expect(view.container).toBeEmptyDOMElement();
      cleanup();
      const withoutDefaults = fixture(kind, {
        defaults: false,
        load: () => new Promise(() => undefined),
      });
      expect(render(<withoutDefaults.View />).container).toBeEmptyDOMElement();
    });

    it('preserves import causes, reports failure, and reimports on retry', async () => {
      const cause = new TypeError('createCalendarPage is not a function');
      let attempts = 0;
      const { View, handle, load, source } = fixture(kind, {
        load: async (module) => {
          if (++attempts === 1) throw cause;
          return module;
        },
      });
      render(<View />);
      expect(
        await screen.findByText('users:resourceModuleLoad'),
      ).toBeInTheDocument();
      expect(handle.status).toBe('error');
      expect(
        vi
          .mocked(console.error)
          .mock.calls.filter(
            ([message]) =>
              typeof message === 'string' &&
              message.startsWith('[react-layout]'),
          ),
      ).toHaveLength(1);
      expect(
        source
          .getSnapshot()
          .nodes.find(
            (node) => node.kind === 'lazy' && node.status === 'error',
          ),
      ).toMatchObject({
        active: 1,
        error: {
          code: 'resourceModuleLoad',
          cause: { name: 'TypeError', message: cause.message },
        },
      });
      fireEvent.click(screen.getByText('Retry'));
      expect(await screen.findByText('Loaded content')).toBeInTheDocument();
      expect(handle.status).toBe('resolved');
      expect(load).toHaveBeenCalledTimes(2);
      expect(
        source
          .getSnapshot()
          .nodes.filter((node) => node.kind === 'lazy')
          .every((node) => node.error === undefined),
      ).toBe(true);
    });

    it.each([0, 2])(
      'reports %i matching exports as a shape error without wrapping it',
      async (count) => {
        const { View, source } = fixture(kind, {
          load: async (module) =>
            count ? { ...module, Duplicate: Object.values(module)[0] } : {},
        });
        render(<View />);
        expect(
          await screen.findByText('users:lazyResourceModuleShape'),
        ).toBeInTheDocument();
        expect(
          source
            .getSnapshot()
            .nodes.find(
              (node) => node.kind === 'lazy' && node.status === 'error',
            )?.error,
        ).toMatchObject({ code: 'lazyResourceModuleShape' });
      },
    );

    it('passes ordinary content render errors through to the route boundary', async () => {
      const failure = new Error('Content render failed');
      const { View } = fixture(kind, {
        content: () => {
          throw failure;
        },
      });
      const caught = vi.fn();
      class RouteBoundary extends Component<
        { children: ReactNode },
        { failed: boolean }
      > {
        state = { failed: false };
        static getDerivedStateFromError() {
          return { failed: true };
        }
        componentDidCatch(error: unknown) {
          caught(error);
        }
        render() {
          return this.state.failed ? <p>Route error</p> : this.props.children;
        }
      }
      render(
        <RouteBoundary>
          <View />
        </RouteBoundary>,
      );
      expect(await screen.findByText('Route error')).toBeInTheDocument();
      expect(caught).toHaveBeenCalledWith(failure);
      expect(screen.queryByText('Retry')).toBeNull();
    });
  },
);

it.each<Kind>(['state', 'scoped'])(
  '%s uses the nearest Loading state before factory defaults',
  (kind) => {
    const { View } = fixture(kind, {
      nearest: true,
      load: () => new Promise(() => undefined),
    });
    render(<View />);
    expect(screen.getByText('Nearest loading')).toBeInTheDocument();
    expect(screen.queryByText('Global loading users')).toBeNull();
  },
);

it('does not synthesize React statics or become a thenable, including under StrictMode', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const definition = factory.defineResourceLayout({
    render: {
      default: () => <p>Safe proxy</p>,
      Loading: () => <p>State Loading</p>,
      Error: () => <p>State Error</p>,
      NotFound: () => <p>State NotFound</p>,
    },
  });
  const Page = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const Lazy = factory.defineResourceLayout.lazy({
    resource: 'users',
    load: async () => ({ Page }),
  });
  const statics = Lazy as unknown as Record<string, unknown>;
  for (const name of [
    'contextTypes',
    'childContextTypes',
    'contextType',
    'defaultProps',
    'then',
    'catch',
    'toJSON',
    'getDerivedStateFromProps',
  ])
    expect(statics[name]).toBeUndefined();
  expect(await Promise.resolve(Lazy)).toBe(Lazy);
  expect(Lazy.Loading).toBe(Lazy.Loading);
  expect(Lazy.Error).toBeTypeOf('function');
  expect(Lazy.NotFound).toBeTypeOf('function');
  render(
    <StrictMode>
      <Lazy />
    </StrictMode>,
  );
  expect(await screen.findByText('Safe proxy')).toBeInTheDocument();
  expect(console.error).not.toHaveBeenCalled();
});

it('includes the cause in load messages and keeps configuration instanceof compatibility', () => {
  const cause = new TypeError('broken import');
  const error = new ResourceModuleLoadError('users', cause);
  expect(error.message).toContain('TypeError: broken import');
  expect(error.cause).toBe(cause);
  expect(new ResourceModuleLoadError('users', 'offline').message).toContain(
    'offline',
  );
  expect(new LazyResourceModuleShapeError('users', 0)).toBeInstanceOf(
    LayoutConfigurationError,
  );
  expect(new LazyResourceStateNotFoundError('users', 'Detail')).toBeInstanceOf(
    LayoutConfigurationError,
  );
});

it('provides type-only errors and stable, typed error component factories with custom props', () => {
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users', { value: 'teams', subResources: ['members'] }],
  });
  expectTypeOf<
    typeof defineLazyDefaults.errors
  >().toEqualTypeOf<LazyResourceError>();
  expect(defineLazyDefaults.errors).toBeUndefined();
  expect(Object.keys(defineLazyDefaults)).not.toContain('errors');
  const Render = ({
    resource,
    error,
  }: LazyResourceErrorProps<'users' | 'teams' | 'teams.members'>) => (
    <p>
      {resource}:{error.message}
    </p>
  );
  expect(defineLazyDefaults.createErrorComponent(Render)).toBe(Render);
  const Custom = defineLazyDefaults.createErrorComponent<{ title: string }>(
    ({ title, error, resource }) => (
      <p>
        {title}:{resource}:{error.code}
      </p>
    ),
  );
  expectTypeOf(Custom).toMatchTypeOf<
    ComponentType<
      { title: string } & LazyResourceErrorProps<
        'users' | 'teams' | 'teams.members'
      >
    >
  >();
  const ByCode = defineLazyDefaults.createErrorComponent({
    lazyResourceStateNotFound: ({ error, resource }) => {
      expectTypeOf(error).toEqualTypeOf<LazyResourceStateNotFoundError>();
      expectTypeOf(resource).toEqualTypeOf<
        'users' | 'teams' | 'teams.members'
      >();
      return <p>{error.state}</p>;
    },
    fallback: ({ error }) => <p>Fallback {error.code}</p>,
  });
  const retry = vi.fn();
  render(
    <ByCode
      error={new LazyResourceStateNotFoundError('users', 'Detail')}
      resource="users"
      retry={retry}
    />,
  );
  expect(screen.getByText('Detail')).toBeInTheDocument();
  cleanup();
  render(
    <ByCode
      error={new ResourceModuleLoadError('users', 'offline')}
      resource="users"
      retry={retry}
    />,
  );
  expect(screen.getByText('Fallback resourceModuleLoad')).toBeInTheDocument();
  defineLazyDefaults({
    Error: ({ error, resource }) => {
      expectTypeOf(error).toEqualTypeOf<LazyResourceError>();
      expectTypeOf(resource).toEqualTypeOf<
        'users' | 'teams' | 'teams.members'
      >();
      return null;
    },
  });
});

it('rethrows errors with no code handler or fallback', () => {
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users'],
  });
  const ErrorUI = defineLazyDefaults.createErrorComponent({});
  const error = new ResourceModuleLoadError('users', 'offline');
  expect(() =>
    render(<ErrorUI error={error} resource="users" retry={() => undefined} />),
  ).toThrow(error);
  expect(isLazyResourceError(error)).toBe(true);
  expect(isLazyResourceError(new Error())).toBe(false);
});

it('preserves shell-declared scoped props, lazy options, handles, and render/lazy exclusivity', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: () => <></>,
  });
  const scope = createResourceLayout.forResources('users');
  const entry = scope.createResourceComponents({
    resource: 'users',
    components: {
      Grid: {
        props: { title: createProp.string() },
        lazy: {
          load: async () => ({
            Grid: ({ title }: { title: string }) => <p>{title}</p>,
          }),
          fallback: <p>Grid loading</p>,
        },
      },
    },
    render: (_, ctx) => <ctx.Grid title="Typed lazy grid" />,
  });
  const Shell = scope.createComponent({
    resources: { users: entry },
    render: (_, ctx) => {
      expectTypeOf(ctx.Users.Grid).toMatchTypeOf<LazyHandle>();
      expectTypeOf(ctx.Users.Grid).toBeCallableWith({ title: 'Title' });
      return <ctx.Users />;
    },
  });
  const Bound = Shell.asHOF()('users');
  expectTypeOf(Bound).toMatchTypeOf<LazyHandle>();
  expectTypeOf(entry).toMatchTypeOf<LazyHandle>();
  const state = factory.createRenderState.lazy(async () => ({
    State: factory.createRenderState(() => <p>State</p>),
  }));
  expectTypeOf(state).toMatchTypeOf<LazyHandle>();
  render(<Bound />);
  expect(await screen.findByText('Typed lazy grid')).toBeInTheDocument();
  () => {
    // @ts-expect-error eager and lazy content are mutually exclusive
    scope.createResourceComponents({
      resource: 'users',
      render: () => null,
      lazy: async () => ({ Content: () => null }),
    });
    scope.createResourceComponents({
      resource: 'users',
      render: () => null,
      components: {
        Bad: {
          // @ts-expect-error scoped content cannot declare render and lazy together
          render: () => null,
          // @ts-expect-error scoped content cannot declare render and lazy together
          lazy: async () => ({ Content: () => null }),
        },
      },
    });
  };
});

it('imports a shell whose deferred content imports the shell back without a TDZ failure', async () => {
  const { Appointments } = await import('./fixtures/lazy-scoped-shell');
  render(<Appointments />);
  expect(
    await screen.findByText('Appointments round-trip'),
  ).toBeInTheDocument();
});

it('reports missing lazy resource compound states through the typed error UI', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  factory.defineLazyDefaults({ Error: ({ error }) => <p>{error.code}</p> });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: () => <p>Page</p>,
  });
  const Page = createResourceLayout({ resource: 'users', name: 'Users' });
  const Lazy = factory.defineResourceLayout.lazy({
    resource: 'users',
    load: async () => ({ Page }),
  });
  // A stale imported module can lack a state promised by its declaration types.
  const Missing = (Lazy as unknown as { Missing: ComponentType }).Missing;
  render(<Missing />);
  expect(
    await screen.findByText('lazyResourceStateNotFound'),
  ).toBeInTheDocument();
  expect(Lazy.status).toBe('error');
});

it('supports lazy top-level createComponent content', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: () => <section />,
  });
  const scope = createResourceLayout.forResources('users');
  const Shell = scope.createComponent({
    lazy: async () => ({
      Content: ({ resource }: { resource: string }) => <p>Outer {resource}</p>,
    }),
  });
  const Users = Shell.asHOF()('users');
  expect(Users.status).toBe('unresolved');
  const preloaded = Users.preload();
  expect(Users.preload()).toBe(preloaded);
  await preloaded;
  expect(Users.status).toBe('resolved');
  render(<Users />);
  expect(await screen.findByText('Outer users')).toBeInTheDocument();
});

it('preserves resource prop contracts for raw lazy entries', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: () => <section />,
  });
  const Shell = createResourceLayout.forResources('users').createComponent({
    resources: {
      users: {
        props: { custom: { title: createProp.string() } },
        lazy: async () => ({
          Content: ({ title }: { title: string }) => <p>{title}</p>,
        }),
      },
    },
    render: ({ title }, ctx) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      return <ctx.Users title={title} />;
    },
  });
  const Users = Shell.asHOF()('users');
  expectTypeOf(Users).toBeCallableWith({ title: 'Raw lazy props' });
  () => {
    // @ts-expect-error shell-declared custom props remain required for lazy content
    <Users />;
  };
  render(<Users title="Raw lazy props" />);
  expect(await screen.findByText('Raw lazy props')).toBeInTheDocument();
});

it('retries the underlying import when a derived lazy state fails', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  factory.defineLazyDefaults({
    Error: ({ retry }) => <button onClick={retry}>Retry derived</button>,
  });
  const source = factory.createRenderState(() => <p>Derived recovered</p>);
  let attempts = 0;
  const lazy = factory.createRenderState.lazy(async () => {
    if (++attempts === 1) throw new Error('offline');
    return { source };
  });
  const derived = factory.createRenderState.fromState({
    ref: lazy,
    state: 'Derived',
    render: (_, { composables }) => <composables.Ref />,
  });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: { default: () => <section />, ...derived },
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users.Derived />);
  fireEvent.click(await screen.findByText('Retry derived'));
  expect(await screen.findByText('Derived recovered')).toBeInTheDocument();
  expect(attempts).toBe(2);
});

it('retries failed derived states exported by an outer lazy module', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  factory.defineLazyDefaults({
    Error: ({ retry }) => <button onClick={retry}>Retry nested</button>,
  });
  const source = factory.createRenderState(() => <p>Nested recovered</p>);
  let attempts = 0;
  const lazy = factory.createRenderState.lazy(async () => {
    if (++attempts === 1) throw new Error('offline');
    return { source };
  });
  const derived = factory.createRenderState.fromState({
    ref: lazy,
    render: (_, { composables }) => <composables.Ref />,
  });
  const outer = factory.createRenderState.lazy(async () => ({ derived }));
  const { createResourceLayout } = factory.defineResourceLayout({
    render: { default: outer },
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users />);
  fireEvent.click(await screen.findByText('Retry nested'));
  expect(await screen.findByText('Nested recovered')).toBeInTheDocument();
  expect(attempts).toBe(2);
});

it('isolates scoped loading options between callers and follows changed options', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: { title: createProp.string() },
  });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: {
      default: () => <section />,
      Loading: {
        props: { include: { title: true } },
        render: ({ title }) => {
          const [clicks, setClicks] = useState(0);
          return (
            <button onClick={() => setClicks((value) => value + 1)}>
              Loading {title}: {clicks}
            </button>
          );
        },
      },
    },
  });
  const scope = createResourceLayout.forResources('users');
  const Shell = scope.createComponent({
    props: { include: { title: true } },
    resources: {
      users: {
        lazy: () => new Promise<Record<string, unknown>>(() => undefined),
      },
    },
    render: ({ title }, ctx) => <ctx.Users title={title} />,
  });
  const Users = Shell.asHOF()('users');
  const view = render(
    <>
      <Users title="First" />
      <Users title="Second" />
    </>,
  );
  expect(screen.getByText('Loading First: 0')).toBeInTheDocument();
  expect(screen.getByText('Loading Second: 0')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Loading First: 0'));
  view.rerender(
    <>
      <Users title="Changed" />
      <Users title="Second" />
    </>,
  );
  expect(screen.getByText('Loading Changed: 1')).toBeInTheDocument();
  expect(screen.getByText('Loading Second: 0')).toBeInTheDocument();
});
