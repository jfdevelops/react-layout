import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import {
  createDefinedResourceLayout,
  createProp,
  ResourceModuleLoadError,
  LazyResourceStateNotFoundError,
  type LazyResourceError,
} from '../../src';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function factory() {
  return createDefinedResourceLayout({
    resources: ['users', { value: 'teams', subResources: ['members'] }],
    options: { title: createProp.string() },
    composables: (create) => ({ Layout: create({ name: 'Layout' }) }),
  });
}

it('narrows lazy render params by state and validates included and custom props', () => {
  const { defineLazyDefaults } = factory();
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    props: {
      include: { title: true },
      custom: { showReload: createProp.boolean().optional() },
    },
    render: ({ resource, title, showReload, ...rest }, { composables }) => {
      expectTypeOf(resource).toEqualTypeOf<
        'users' | 'teams' | 'teams.members'
      >();
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(showReload).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(rest).not.toHaveProperty('error');
      expectTypeOf(composables).toHaveProperty('Layout');
      return (
        <composables.Layout>
          {resource}:{title}:{String(showReload)}
        </composables.Layout>
      );
    },
  });
  render(<Loading resource="teams.members" title="Members" showReload />);
  expect(screen.getByText('teams.members:Members:true')).toBeInTheDocument();
  cleanup();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(() =>
    render(<Loading resource="users" title={123 as never} />),
  ).toThrow(/title/);
  expect(() =>
    render(
      <Loading resource="users" title="Users" showReload={'yes' as never} />,
    ),
  ).toThrow(/showReload/);
  expect(() =>
    render(<Loading resource="users" {...({} as { title: string })} />),
  ).toThrow(/title/);
  () => {
    defineLazyDefaults.createRenderState({
      // @ts-expect-error only lazy default state names are accepted
      state: 'NotFound',
      render: () => null,
    });
    // @ts-expect-error included title is required on direct calls
    <Loading resource="users" />;
    // @ts-expect-error custom boolean is validated in the call signature
    <Loading resource="users" title="Users" showReload="yes" />;
  };
});

it('supports narrowed error handlers, fallback, retry, and composables on the alias', () => {
  const { defineLazyDefaults } = factory();
  const ErrorUI = defineLazyDefaults.createRenderState({
    state: 'Error',
    props: { custom: { title: createProp.string() } },
    render: {
      lazyResourceStateNotFound: ({ error, title }, { composables }) => {
        expectTypeOf(error).toEqualTypeOf<LazyResourceStateNotFoundError>();
        return (
          <composables.Layout>
            {title}:{error.state}
          </composables.Layout>
        );
      },
      fallback: ({ error, retry }, { composables }) => (
        <composables.Layout>
          <button onClick={retry}>{error.code}</button>
        </composables.Layout>
      ),
    },
  });
  const retry = vi.fn();
  const view = render(
    <ErrorUI
      resource="users"
      error={new LazyResourceStateNotFoundError('users', 'Detail')}
      retry={retry}
      title="Missing"
    />,
  );
  expect(screen.getByText('Missing:Detail')).toBeInTheDocument();
  view.rerender(
    <ErrorUI
      resource="users"
      error={new ResourceModuleLoadError('users', 'offline')}
      retry={retry}
      title="Error"
    />,
  );
  fireEvent.click(screen.getByRole('button'));
  expect(retry).toHaveBeenCalledOnce();
  cleanup();
  const Legacy = defineLazyDefaults.createErrorComponent(
    ({ error }, { composables }) => {
      expectTypeOf(error).toEqualTypeOf<LazyResourceError>();
      expectTypeOf(composables).toHaveProperty('Layout');
      return <composables.Layout>Legacy:{error.code}</composables.Layout>;
    },
  );
  render(
    <Legacy
      resource="users"
      error={new ResourceModuleLoadError('users', 'offline')}
      retry={retry}
    />,
  );
  expect(screen.getByText('Legacy:resourceModuleLoad')).toBeInTheDocument();
});

it('uses composables in registered lazy defaults without remounting on prop updates', async () => {
  const { defineLazyDefaults, defineResourceLayout } = factory();
  function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
  }
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    render: ({ resource }, { composables }) => (
      <composables.Layout>
        {resource}
        <Counter />
      </composables.Layout>
    ),
  });
  defineLazyDefaults({ Loading });
  const Users = defineResourceLayout({
    render: () => <p>Loaded</p>,
  }).createResourceLayout({ resource: 'users', name: 'Users', title: 'Users' });
  const Page = defineResourceLayout.lazy({
    resource: 'users',
    load: () => new Promise<{ Users: typeof Users }>(() => {}),
  });
  const view = render(<Page />);
  fireEvent.click(screen.getByRole('button'));
  view.rerender(<Page />);
  expect(screen.getByRole('button')).toHaveTextContent('1');
  expect(screen.getByText('users')).toBeInTheDocument();
});

it('shares render-state composables and keeps children optional in lazy defaults', () => {
  const base = createDefinedResourceLayout({ resources: ['users'] });
  const Shell = base.createRenderState({
    state: 'Layout',
    props: {
      custom: { children: createProp.component({ type: 'ReactNode' }) },
    },
    render: ({ children }) => <section>{children ?? 'Shared shell'}</section>,
  });
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users'],
    composables: () => ({ Layout: Shell.asComposable() }),
  });
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    props: Shell.Layout.props,
    render: (_props, { composables }) => <composables.Layout />,
  });
  render(<Loading resource="users" />);
  expect(screen.getByText('Shared shell')).toBeInTheDocument();
});

it('preserves hooks in existing error components', () => {
  const { defineLazyDefaults } = factory();
  const ErrorUI = defineLazyDefaults.createErrorComponent(() => {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
  });
  render(
    <ErrorUI
      resource="users"
      error={new ResourceModuleLoadError('users', 'offline')}
      retry={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('1');
});

it('preserves config-only lazy includes and excludes them from component props', () => {
  const { defineLazyDefaults } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: createProp.string().literal('Configured title'),
      subtitle: createProp.string().optional(),
    },
  });
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    props: {
      include: {
        title: { required: true, suppliedVia: 'config' },
        subtitle: { required: false, suppliedVia: 'config' },
      },
    },
    render: ({ title, subtitle }) => {
      expectTypeOf(title).toEqualTypeOf<'Configured title'>();
      expectTypeOf(subtitle).toEqualTypeOf<string | undefined>();
      return (
        <p>
          {title}:{subtitle ?? 'No subtitle'}
        </p>
      );
    },
  });
  const bypassProps = {
    title: 'Invalid override',
    subtitle: 'Leaked override',
  };
  render(<Loading resource="users" {...bypassProps} />);
  expect(screen.getByText('Configured title:No subtitle')).toBeInTheDocument();
  expectTypeOf<React.ComponentProps<typeof Loading>>().not.toHaveProperty(
    'title',
  );
  expectTypeOf<React.ComponentProps<typeof Loading>>().not.toHaveProperty(
    'subtitle',
  );
  () => {
    <Loading resource="users" />;
    // @ts-expect-error config-only values are excluded from the call signature
    <Loading resource="users" title="Configured title" />;
  };
});

it('keeps explicit component and optional lazy includes validated', () => {
  const { defineLazyDefaults } = factory();
  const Loading = defineLazyDefaults.createRenderState({
    state: 'Loading',
    props: {
      include: { title: { required: false, suppliedVia: 'component' } },
    },
    render: ({ title }) => <p>{title ?? 'No title'}</p>,
  });
  const view = render(<Loading resource="users" />);
  expect(screen.getByText('No title')).toBeInTheDocument();
  view.rerender(<Loading resource="users" title="Caller title" />);
  expect(screen.getByText('Caller title')).toBeInTheDocument();
  cleanup();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(() =>
    render(<Loading resource="users" title={123 as never} />),
  ).toThrow(/title/);
});

it('keeps the exported legacy handler type callable with one argument', () => {
  type Handlers = import('../../src').LazyErrorHandlers<'users'>;
  const handlers: Handlers = { fallback: ({ resource }) => <p>{resource}</p> };
  render(
    <>
      {handlers.fallback!({
        resource: 'users',
        error: new ResourceModuleLoadError('users', 'offline'),
        retry: () => {},
      })}
    </>,
  );
  expect(screen.getByText('users')).toBeInTheDocument();
});
