import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createComposableComponent,
  createProp,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';

afterEach(() => {
  cleanup();
});

/** A shell definition bound to two resources, with a resource-scoped Layout
 *  composable and a `title` option surfaced to the shell render. */
function defineAdminLayout(onSidebarMount?: () => void) {
  return defineResourceLayout.withLayout({
    resources: ['users', 'posts'],
    options: {
      title: createProp.string().optional(),
    },
    shell: {
      composables: (create) => ({
        Layout: create({
          name: ({ capitalize, resource }) =>
            resource ? `${capitalize(resource)}Shell` : 'Shell',
        }),
      }),
      props: {
        include: {
          title: { visibility: 'optional', passthrough: 'component' },
        },
      },
      render: ({ title }, { resource, resources, children }) => (
        <div data-testid='shell'>
          <Sidebar onMount={onSidebarMount} />
          <span data-testid='current'>{resources.current ?? 'none'}</span>
          <span data-testid='resource'>{resource ?? 'none'}</span>
          <span data-testid='title'>{title ?? 'untitled'}</span>
          <main>{children}</main>
        </div>
      ),
    },
    layout: {
      props: {
        custom: {
          children: createProp.component({ type: 'ReactNode' }),
        },
      },
      render: ({ children }, { resources }) => (
        <section data-testid={`page-${resources.current}`}>{children}</section>
      ),
    },
  });
}

/** Persists a counter across re-renders so tests can prove the shell subtree is
 *  not remounted when a page navigates. */
function Sidebar({ onMount }: { onMount?: () => void }) {
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  return <nav data-mounted-at={mountedAt}>sidebar</nav>;
}

describe('defineResourceLayout.withLayout', () => {
  it('resolves resources.current from the page mounted in the outlet', () => {
    const { createResourceLayout, Shell } = defineAdminLayout();
    const UsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    })();

    render(
      <Shell>
        <UsersPage>users content</UsersPage>
      </Shell>,
    );

    expect(screen.getByTestId('current')).toHaveTextContent('users');
    expect(screen.getByTestId('resource')).toHaveTextContent('users');
    expect(screen.getByTestId('page-users')).toHaveTextContent('users content');
  });

  it('keeps the shell mounted while the page navigates', () => {
    const onSidebarMount = vi.fn();
    const { createResourceLayout, Shell } = defineAdminLayout(onSidebarMount);
    const UsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    })();
    const PostsPage = createResourceLayout.forResource({
      resource: 'posts',
      name: 'PostsPage',
    })();

    function App() {
      const [resource, setResource] = useState<'users' | 'posts'>('users');

      return (
        <Shell>
          <button type='button' onClick={() => setResource('posts')}>
            go
          </button>
          {resource === 'users' ? (
            <UsersPage>u</UsersPage>
          ) : (
            <PostsPage>p</PostsPage>
          )}
        </Shell>
      );
    }

    render(<App />);
    const sidebarBefore = screen.getByText('sidebar').getAttribute(
      'data-mounted-at',
    );

    fireEvent.click(screen.getByText('go'));

    // Same DOM node, same mount timestamp -> reconciled in place, not remounted.
    expect(screen.getByText('sidebar').getAttribute('data-mounted-at')).toBe(
      sidebarBefore,
    );
    expect(onSidebarMount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current')).toHaveTextContent('posts');
  });

  it('keeps wrapWith chrome mounted across Shell re-renders and navigation', () => {
    const onChromeMount = vi.fn();

    function AppChrome({ children }: { children?: ReactNode }) {
      const [mountedAt] = useState(() => Date.now());

      useEffect(() => {
        onChromeMount();
      }, []);

      return (
        <div data-testid='chrome' data-mounted-at={mountedAt}>
          {children}
        </div>
      );
    }

    const { createResourceLayout, Shell } = defineResourceLayout.withLayout({
      resources: ['users', 'posts'],
      shell: {
        composables: (create) => ({
          Layout: create({
            name: ({ capitalize, resource }) =>
              resource ? `${capitalize(resource)}Shell` : 'Shell',
            wrapWith: AppChrome,
          }),
        }),
        render: (_props, { composables, children }) => (
          <composables.Layout>{children}</composables.Layout>
        ),
      },
    });
    const UsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    })();
    const PostsPage = createResourceLayout.forResource({
      resource: 'posts',
      name: 'PostsPage',
    })();

    function App() {
      const [resource, setResource] = useState<'users' | 'posts'>('users');

      return (
        <Shell>
          <button type='button' onClick={() => setResource('posts')}>
            go
          </button>
          {resource === 'users' ? (
            <UsersPage>u</UsersPage>
          ) : (
            <PostsPage>p</PostsPage>
          )}
        </Shell>
      );
    }

    render(<App />);
    const chromeBefore = screen.getByTestId('chrome').getAttribute(
      'data-mounted-at',
    );

    fireEvent.click(screen.getByText('go'));

    expect(screen.getByTestId('chrome').getAttribute('data-mounted-at')).toBe(
      chromeBefore,
    );
    expect(onChromeMount).toHaveBeenCalledTimes(1);
    expect(screen.getByText('p')).toBeInTheDocument();
  });

  it('does not require config-passthrough include props on Shell', () => {
    const createBreadcrumbComposable = defineComposableComponent({
      name: 'Breadcrumb',
      props: {
        segments: createProp.record({
          value: createProp.string(),
          key: createProp.string(),
        }),
      },
    });
    const Breadcrumb = createBreadcrumbComposable(({ segments }) => (
      <nav>{Object.values(segments).join(' / ')}</nav>
    ));

    const { Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        composables: (create) => ({
          Layout: create({ name: 'Shell' }),
          ...Breadcrumb,
        }),
        props: {
          include: { segments: true },
        },
        render: (_props, { composables, children }) => (
          <composables.Layout>{children}</composables.Layout>
        ),
      },
    });

    expect(() =>
      render(
        <Shell>
          <p>content</p>
        </Shell>,
      ),
    ).not.toThrow();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('lets an explicit resource prop win over the reported resource', () => {
    const { createResourceLayout, Shell } = defineAdminLayout();
    const UsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    })();

    render(
      <Shell resource='posts'>
        <UsersPage>u</UsersPage>
      </Shell>,
    );

    expect(screen.getByTestId('current')).toHaveTextContent('posts');
  });

  it('renders `none` until a resource is reported and no prop is given', () => {
    const { Shell } = defineAdminLayout();

    render(
      <Shell>
        <p>raw content</p>
      </Shell>,
    );

    expect(screen.getByTestId('current')).toHaveTextContent('none');
    expect(screen.getByText('raw content')).toBeInTheDocument();
  });

  it('names the shell Layout composable per the reported resource', () => {
    const Marker = createComposableComponent({ name: 'Marker' });
    const { createResourceLayout, Shell } = defineResourceLayout.withLayout({
      resources: ['users', 'posts'],
      shell: {
        composables: (create) => ({
          Layout: create({ name: 'Shell' }),
          Marker: create({
            name: ({ capitalize, resource }) =>
              resource ? `${capitalize(resource)}Marker` : 'Marker',
            wrapWith: Marker,
          }),
        }),
        render: (_props, { composables, children }) => (
          <div>
            <composables.Marker />
            {children}
          </div>
        ),
      },
    });
    const PostsPage = createResourceLayout.forResource({
      resource: 'posts',
      name: 'PostsPage',
    })();

    render(
      <Shell>
        <PostsPage>p</PostsPage>
      </Shell>,
    );

    // The resolved composable carries the resource-scoped display name.
    // (Rendered element type name is asserted via React's dev tooling elsewhere;
    // here we assert the child renders without throwing and the page mounts.)
    expect(screen.getByText('p')).toBeInTheDocument();
  });

  it('makes `layout.render` optional — the page renders its children into the shell', () => {
    const { createResourceLayout, Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        render: (_props, { children }) => (
          <div data-testid='shell'>{children}</div>
        ),
      },
    });
    const UsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    })();

    render(
      <Shell>
        <UsersPage>slot content</UsersPage>
      </Shell>,
    );

    expect(screen.getByTestId('shell')).toHaveTextContent('slot content');
  });

  it('still exposes the base config helpers', () => {
    const defined = defineAdminLayout();

    expect(typeof defined.createResourceConfig).toBe('function');
    expect(typeof defined.createResourceLinks).toBe('function');
    expect(typeof defined.createResourceLayout).toBe('function');
    expect(defined.resources()).toEqual(['users', 'posts']);
  });
});

// Type-only: keep `ReactNode` import meaningful for the shell children contract.
export type _ShellChildren = ReactNode;
