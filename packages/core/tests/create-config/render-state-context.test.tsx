import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, it } from 'vitest';
import {
  createDefinedResourceLayout,
  createProp,
  ResourceModuleLoadError,
} from '../../src';

afterEach(cleanup);

it('reports the caller through nested shared shells and keeps direct states independent', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  type States = 'default' | 'Loading' | 'Error' | 'NotFound' | 'Audit';
  const createState = factory.createRenderState.forStates(
    'default',
    'Loading',
    'Error',
    'NotFound',
    'Audit',
  );
  const Inner = createState({
    state: 'Inner',
    props: {
      custom: {
        children: createProp.component({ type: 'ReactNode' }).optional(),
      },
    },
    render: ({ children }, { state }) => {
      expectTypeOf(state).toEqualTypeOf<States>();
      if (state === 'Loading') expectTypeOf(state).toEqualTypeOf<'Loading'>();
      return (
        <section data-testid="inner">
          {state}:{children}
        </section>
      );
    },
  });
  const Shell = createState({
    state: 'Layout',
    composables: () => ({ Inner: Inner.asComposable() }),
    render: (_, { composables, state }) => (
      <composables.Inner>
        <span data-testid="shell">{state}</span>
      </composables.Inner>
    ),
  });
  const outer = (state: States) =>
    createState({
      state,
      composables: () => ({ Shell: Shell.asComposable() }),
      render: (_, { composables }) => <composables.Shell />,
    });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: {
      ...outer('default'),
      ...outer('Loading'),
      ...outer('Error'),
      ...outer('NotFound'),
      ...outer('Audit'),
    },
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });
  for (const [State, name] of [
    [Users, 'default'],
    [Users.Loading, 'Loading'],
    [Users.Error, 'Error'],
    [Users.NotFound, 'NotFound'],
    [Users.Audit, 'Audit'],
  ] as const) {
    const view = render(<State />);
    expect(screen.getByTestId('shell')).toHaveTextContent(name);
    expect(screen.getByTestId('inner').textContent).toBe(`${name}:${name}`);
    view.unmount();
  }
});

it('provides literal state contexts for lazy defaults and their shared shells', () => {
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users'],
  });
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    render: (_, { state }) => {
      expectTypeOf(state).toEqualTypeOf<'Loading'>();
      return <p>{state}</p>;
    },
  });
  const ErrorUI = defineLazyDefaults.createRenderState({
    state: 'Error',
    render: {
      fallback: (_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<'Error'>();
        return <p>{state}</p>;
      },
    },
  });
  expectTypeOf(ErrorUI).not.toBeAny();
  const view = render(<Loading resource="users" />);
  expect(screen.getByText('Loading')).toBeInTheDocument();
  view.unmount();
  render(
    <ErrorUI
      resource="users"
      error={new ResourceModuleLoadError('users', 'offline')}
      retry={() => {}}
    />,
  );
  expect(screen.getByText('Error')).toBeInTheDocument();
});

it('sets the built-in state for ordinary layouts', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: (_, { state }) => <p>{state}</p>,
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users />);
  expect(screen.getByText('default')).toBeInTheDocument();
});

it('infers inline state unions and exposes the active state in scoped render contexts', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const children = {
    custom: {
      children: createProp.component({ type: 'ReactNode' }).optional(),
    },
  };
  const ErrorState = factory.createRenderState({
    state: 'Error',
    props: children,
    render: ({ children }) => <>{children}</>,
  });
  const Audit = factory.createRenderState({
    state: 'Audit',
    props: children,
    render: ({ children }) => <>{children}</>,
  });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: {
      default: (_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<'default' | 'Error' | 'Audit'>();
        return <p>{state}</p>;
      },
      ...ErrorState,
      ...Audit,
    },
  });
  const Users = createResourceLayout({ resource: 'users', name: 'Users' });
  const Directory = createResourceLayout.forResources('users').createComponent({
    resources: {
      users: {
        components: {
          Badge: {
            props: {},
            render: (_, { state }) => {
              expectTypeOf(state).toEqualTypeOf<
                'default' | 'Error' | 'Audit'
              >();
              return <span data-testid="badge">{state}</span>;
            },
          },
        },
        render: (_, components) => (
          <div data-testid="resource">
            {components.state}
            <components.Badge />
          </div>
        ),
      },
    },
    render: (_, context) => (
      <div data-testid="scoped">
        {context.state}
        <context.Users />
      </div>
    ),
  });
  render(
    <Users.Error>
      <Directory resource="users" />
    </Users.Error>,
  );
  expect(screen.getByTestId('badge')).toHaveTextContent('Error');
  expect(screen.getByTestId('resource').textContent).toBe('ErrorError');
  expect(screen.getByTestId('scoped').textContent).toBe('ErrorErrorError');
});

it('keeps directly rendered nested layouts independent from the enclosing state', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Inner = factory
    .defineResourceLayout({
      render: {
        default: (_, { state }) => (
          <span data-testid="direct-default">{state}</span>
        ),
        ...factory.createRenderState({
          state: 'Error',
          render: (_, { state }) => (
            <span data-testid="direct-error">{state}</span>
          ),
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Inner' });
  const Outer = factory
    .defineResourceLayout({
      render: {
        default: () => <></>,
        ...factory.createRenderState({
          state: 'Loading',
          render: () => (
            <>
              <Inner />
              <Inner.Error />
            </>
          ),
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Outer' });
  render(<Outer.Loading />);
  expect(screen.getByTestId('direct-default')).toHaveTextContent('default');
  expect(screen.getByTestId('direct-error')).toHaveTextContent('Error');
});

it('retains the calling state through lazy state references', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Shell = factory.createRenderState({
    state: 'Layout',
    render: (_, { state }) => <p data-testid="lazy-shell">{state}</p>,
  });
  const LazyShell = factory.createRenderState.lazy(async () => ({ Shell }));
  const Users = factory
    .defineResourceLayout({
      render: {
        default: () => <></>,
        ...factory.createRenderState({
          state: 'Error',
          composables: () => ({ Shell: LazyShell.asComposable() }),
          render: (_, { composables }) => <composables.Shell />,
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users.Error />);
  expect(await screen.findByTestId('lazy-shell')).toHaveTextContent('Error');
});

it('gives automatic fallbacks their own state while a shared lazy shell is pending', async () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Shell = factory.createRenderState({
    state: 'Layout',
    render: (_, { state }) => <p data-testid="resolved-shell">{state}</p>,
  });
  let resolve!: (value: { Shell: typeof Shell }) => void;
  const pending = new Promise<{ Shell: typeof Shell }>((done) => {
    resolve = done;
  });
  const LazyShell = factory.createRenderState.lazy(() => pending);
  const Users = factory
    .defineResourceLayout({
      render: {
        default: () => <></>,
        ...factory.createRenderState({
          state: 'Loading',
          render: (_, { state }) => <p data-testid="pending-shell">{state}</p>,
        }),
        ...factory.createRenderState({
          state: 'Error',
          composables: () => ({ Shell: LazyShell.asComposable() }),
          render: (_, { composables }) => <composables.Shell />,
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users.Error />);
  expect(screen.getByTestId('pending-shell')).toHaveTextContent('Loading');
  resolve({ Shell });
  expect(await screen.findByTestId('resolved-shell')).toHaveTextContent(
    'Error',
  );
});

it('keeps unbound shared-state contexts safe for custom callers', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Shell = factory.createRenderState({
    state: 'Layout',
    render: (_, { state }) => {
      expectTypeOf(state).toEqualTypeOf<string>();
      if (state === 'Audit') expectTypeOf<typeof state>().toEqualTypeOf<'Audit'>();
      return <p>{state}</p>;
    },
  });
  const Derived = factory.createRenderState.fromState({
    ref: Shell,
    state: 'Derived',
    render: (_, { state, composables }) => {
      expectTypeOf(state).toEqualTypeOf<string>();
      return <composables.Ref />;
    },
  });
  const Users = factory
    .defineResourceLayout({
      render: {
        default: () => <></>,
        ...factory.createRenderState({
          state: 'Audit',
          composables: () => ({ Shell: Derived.asComposable() }),
          render: (_, { composables }) => <composables.Shell />,
        }),
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  render(<Users.Audit />);
  expect(screen.getByText('Audit')).toBeInTheDocument();
});

it.each([
  ['deferred', 'states.default'],
  ['deferred', 'asComposable'],
  ['lazy', 'states.default'],
  ['lazy', 'asComposable'],
] as const)(
  'preserves callers through %s defaults referenced via %s',
  async (kind, via) => {
    const factory = createDefinedResourceLayout({ resources: ['users'] });
    const Definition = factory.createRenderState({
      state: 'default',
      render: (_, { state }) => <p data-testid="registered-default">{state}</p>,
    });
    const Deferred = factory.createRenderState.defer(Definition.default);
    const Lazy = factory.createRenderState.lazy(async () => ({ Definition }));
    const source = kind === 'deferred' ? Deferred : Lazy;
    const Users = factory
      .defineResourceLayout({
        composables: (_create, states) => ({
          Default:
            via === 'states.default' ? states.default : source.asComposable(),
        }),
        render: {
          default: kind === 'deferred' ? Deferred.default : Lazy,
          Error: { render: (_, { composables }) => <composables.Default /> },
        },
      })
      .createResourceLayout({ resource: 'users', name: 'Users' });
    const view = render(<Users.Error />);
    expect(await screen.findByTestId('registered-default')).toHaveTextContent(
      'Error',
    );
    view.unmount();
    render(<Users />);
    expect(await screen.findByTestId('registered-default')).toHaveTextContent(
      'default',
    );
  },
);

it('exposes the literal Error state through the deprecated lazy helper', () => {
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users'],
  });
  const Legacy = defineLazyDefaults.createErrorComponent(
    (_props, { state }) => {
      expectTypeOf(state).toEqualTypeOf<'Error'>();
      return <p>{state}</p>;
    },
  );
  render(
    <Legacy
      resource="users"
      error={new ResourceModuleLoadError('users', 'offline')}
      retry={() => {}}
    />,
  );
  expect(screen.getByText('Error')).toBeInTheDocument();
});
