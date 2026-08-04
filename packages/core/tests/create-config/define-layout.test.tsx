import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Component, useState, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createProp,
  createComposableComponent,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';

class RenderErrorBoundary extends Component<
  { children?: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Renders `element` and returns the error it threw during render.
 *
 * Letting the error propagate out of `render` leaves it uncaught, which jsdom
 * reports to its virtual console — full stacks in otherwise passing output.
 * Three things are needed to keep it quiet: the boundary contains the error,
 * the spy silences React's own `console.error`, and the listener cancels the
 * synthetic window error event React dispatches in development so browsers
 * still report caught render errors.
 */
function renderCapturingError(element: ReactNode) {
  let captured: Error | undefined;
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const suppressWindowError = (event: ErrorEvent) => event.preventDefault();

  window.addEventListener('error', suppressWindowError);

  try {
    render(
      <RenderErrorBoundary
        onError={(error) => {
          captured = error;
        }}
      >
        {element}
      </RenderErrorBoundary>,
    );
  } finally {
    window.removeEventListener('error', suppressWindowError);
    consoleError.mockRestore();
  }

  return captured;
}

function createTestResourceLayout() {
  return defineResourceLayout({
    resources: ['users', 'posts'],
    options: {},
    layout: {
      render: () => <section />,
    },
  });
}

function createContactsComposableLayout() {
  const createBreadcrumbComposable = defineComposableComponent({
    name: 'Breadcrumbs',
    props: {
      segments: createProp.record({
        value: createProp.string(),
        key: createProp.string().literal('contacts').or(createProp.string()),
      }),
    },
  });

  const Breadcrumbs = createBreadcrumbComposable((props) => (
    <nav aria-label='Breadcrumb'>
      {Object.values(props.segments).join(' / ')}
    </nav>
  ));

  const { createResourceLayout } = defineResourceLayout({
    resources: ['contacts'],
    options: {
      title: createProp.string(),
    },
    layout: {
      composables: () => ({
        Layout: createComposableComponent({
          name: 'Layout',
        }),
        ...Breadcrumbs,
      }),
      props: {
        include: {
          title: true,
          segments: true,
        },
      },
      render: (props, { composables }) => (
        <section>
          <composables.Breadcrumbs segments={props.segments} />
          <h1>{props.title}</h1>
        </section>
      ),
    },
  });

  return { createResourceLayout, Breadcrumbs };
}

describe('createResourceLinks', () => {
  it('allows an arbitrary property name', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        overview: {
          label: 'Overview',
          href(resource) {
            const overviewResource: 'overview' = resource;

            return `/directory/${overviewResource}`;
          },
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory/overview',
          full: '/directory/overview#overview',
        },
        label: 'Overview',
        resource: 'overview',
        icon: null,
      },
    ]);
  });

  it('throws when config is missing', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ users: undefined } as never),
    ).toThrowError(
      '[createResourceLinks]: "config" is required for the users resource.',
    );
  });

  it('throws when config is not an object', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ users: 'not-an-object' } as never),
    ).toThrowError(
      '[createResourceLinks]: "config" must be an object for the users resource. Received string',
    );
  });

  it('throws when label is missing', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() => createResourceLinks({ users: {} } as never)).toThrowError(
      '[createResourceLinks]: "label" is required for the users resource.',
    );
  });

  it('throws when label is not a string', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ users: { label: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "label" must be a string for the users resource. Received number',
    );
  });

  it('throws when href is not a string or function', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ users: { label: 'Users', href: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "href" must be a string or function for the users resource. Received number',
    );
  });

  it('throws when hash is not a string or function', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ users: { label: 'Users', hash: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "hash" must be a string or function for the users resource. Received number',
    );
  });

  it('uses / as href and the resource name as hash by default', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(createResourceLinks({ users: { label: 'Users' } })).toEqual([
      {
        href: {
          given: '/',
          full: '/#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses a custom string href with the resource name as hash', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: '/directory',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory',
          full: '/directory#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('resolves hrefs from a function', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: (resource) => `/directory/${resource}`,
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory/users',
          full: '/directory/users#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses a custom string hash and strips leading hashes', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          hash: '#directory-users',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#directory-users',
          hash: 'directory-users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('resolves hashes from a function', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          hash: (resource) => `${resource}-section`,
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#users-section',
          hash: 'users-section',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses the href hash when href and hash are both provided', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: '/directory#overview',
          hash: 'ignored',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory#overview',
          full: '/directory#overview',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('maps each resource entry to a link', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: { label: 'Users' },
        posts: { label: 'Posts', href: '/content', hash: 'articles' },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
      {
        href: {
          given: '/content',
          full: '/content#articles',
          hash: 'articles',
        },
        label: 'Posts',
        resource: 'posts',
        icon: null,
      },
    ]);
  });

  it('includes the resource name on each link', () => {
    const { createResourceLinks } = createTestResourceLayout();

    const links = createResourceLinks({
      users: { label: 'Users' },
      posts: { label: 'Posts' },
    });

    expect(links.map((link) => link.resource)).toEqual(['users', 'posts']);
  });

  it('defaults icon to null when not provided', () => {
    const { createResourceLinks } = createTestResourceLayout();

    const [link] = createResourceLinks({ users: { label: 'Users' } });

    expect(link.icon).toBeNull();
  });

  it('includes a custom icon when provided', () => {
    const { createResourceLinks } = createTestResourceLayout();
    const icon = <span data-testid='users-icon'>U</span>;

    const [link] = createResourceLinks({
      users: { label: 'Users', icon },
    });

    expect(link.icon).toBe(icon);
  });

  describe('withGroups', () => {
    it('defaults group label to null when not provided', () => {
      const { createResourceLinks } = createTestResourceLayout();

      const [group] = createResourceLinks.withGroups([
        { links: { users: { label: 'Users' } } },
      ]);

      expect(group.label).toBeNull();
    });

    it('throws when label is not a string', () => {
      const { createResourceLinks } = createTestResourceLayout();

      expect(() =>
        createResourceLinks.withGroups([
          { label: 123, links: { users: { label: 'Users' } } } as never,
        ]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "label" must be a string for group at index 0. Received number',
      );
    });

    it('throws when links is missing from a group', () => {
      const { createResourceLinks } = createTestResourceLayout();

      expect(() =>
        createResourceLinks.withGroups([{ label: 'Directory' } as never]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "links" is required for group at index 0.',
      );
    });

    it('throws when links is not an object', () => {
      const { createResourceLinks } = createTestResourceLayout();

      expect(() =>
        createResourceLinks.withGroups([
          { label: 'Directory', links: 'not-an-object' } as never,
        ]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "links" must be an object for group at index 0. Received string',
      );
    });

    it('allows an arbitrary link property name', () => {
      const { createResourceLinks } = createTestResourceLayout();

      const [group] = createResourceLinks.withGroups([
        {
          label: 'Directory',
          links: {
            overview: {
              label: 'Overview',
              hash(resource) {
                const overviewResource: 'overview' = resource;

                return `${overviewResource}-section`;
              },
            },
          },
        },
      ]);

      expect(group.links).toEqual([
        {
          href: {
            given: '/',
            full: '/#overview-section',
            hash: 'overview-section',
          },
          label: 'Overview',
          resource: 'overview',
          icon: null,
        },
      ]);
    });

    it('assigns a generated id to each group', () => {
      const { createResourceLinks } = createTestResourceLayout();

      const groups = createResourceLinks.withGroups([
        { label: 'Directory', links: { users: { label: 'Users' } } },
        { links: { posts: { label: 'Posts' } } },
      ]);

      expect(groups[0]?.id).toEqual(expect.any(String));
      expect(groups[1]?.id).toEqual(expect.any(String));
      expect(groups[0]?.id).not.toBe(groups[1]?.id);
    });

    it('maps each group to id, label, icon, and links', () => {
      const { createResourceLinks } = createTestResourceLayout();
      const icon = <span data-testid='directory-icon'>D</span>;

      const groups = createResourceLinks.withGroups([
        {
          label: 'Directory',
          icon,
          links: {
            users: { label: 'Users' },
            posts: { label: 'Posts', href: '/content', hash: 'articles' },
          },
        },
        {
          label: 'Settings',
          links: {
            users: { label: 'User Settings', hash: 'user-settings' },
          },
        },
      ]);

      expect(groups).toEqual([
        {
          id: expect.any(String),
          label: 'Directory',
          icon,
          links: [
            {
              href: {
                given: '/',
                full: '/#users',
              },
              label: 'Users',
              resource: 'users',
              icon: null,
            },
            {
              href: {
                given: '/content',
                full: '/content#articles',
                hash: 'articles',
              },
              label: 'Posts',
              resource: 'posts',
              icon: null,
            },
          ],
        },
        {
          id: expect.any(String),
          label: 'Settings',
          icon: null,
          links: [
            {
              href: {
                given: '/',
                full: '/#user-settings',
                hash: 'user-settings',
              },
              label: 'User Settings',
              resource: 'users',
              icon: null,
            },
          ],
        },
      ]);
    });

    it('defaults group icon to null when not provided', () => {
      const { createResourceLinks } = createTestResourceLayout();

      const [group] = createResourceLinks.withGroups([
        {
          label: 'Directory',
          links: { users: { label: 'Users' } },
        },
      ]);

      expect(group.icon).toBeNull();
    });
  });
});

describe('defineResourceLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates layouts bound to a resource and uses the provided default name', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'posts'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
            <h1>{props.title}</h1>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    });
    const UsersPage = createUsersPage({
      title: 'Directory',
    });

    render(<UsersPage />);

    expect(screen.getByText('UsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Directory' }),
    ).toBeInTheDocument();
  });

  it('creates resource-bound layouts from every supported notation', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });

    const createUsersPage = createResourceLayout.forResource('users');
    const UsersPage = createUsersPage({
      name: 'UsersPage',
    });
    const createUsersDirectory = createResourceLayout.forResource({
      resource: 'users',
      name: (resource) => `${resource}Directory`,
    });
    const UsersDirectory = createUsersDirectory();
    const createMappedUsersDirectory = createResourceLayout.forResource({
      resource: 'users',
      name: {
        users: (resource) => `${resource.toLowerCase()}Directory`,
      },
    });
    const MappedUsersDirectory = createMappedUsersDirectory();
    const createAdminsDirectory = createResourceLayout.forResource({
      admins: {
        name: (resource) => `${resource.toLowerCase()}Directory`,
      },
    });
    const AdminsDirectory = createAdminsDirectory();

    expect(UsersPage.displayName).toBe('UsersPage');
    expect(UsersDirectory.displayName).toBe('UsersDirectory');
    expect(MappedUsersDirectory.displayName).toBe('usersDirectory');
    expect(AdminsDirectory.displayName).toBe('adminsDirectory');
  });

  it('creates resource-bound layouts from resource arguments', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins', 'posts'],
      options: {},
      layout: {
        render: (_props, context) => (
          <span>{`${context.resource}:${context.name}`}</span>
        ),
      },
    });

    const createScopedResourceLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const UsersPage = createScopedResourceLayout({
      resource: 'users',
      name: 'UsersPage',
    });
    const createAdminsPage = createScopedResourceLayout.forResource({
      resource: 'admins',
      name: 'AdminsPage',
    });
    const AdminsPage = createAdminsPage({});

    render(
      <>
        <UsersPage />
        <AdminsPage />
      </>,
    );

    expect(screen.getByText('users:UsersPage')).toBeInTheDocument();
    expect(screen.getByText('admins:AdminsPage')).toBeInTheDocument();
    expect(createScopedResourceLayout).not.toHaveProperty('forResources');
  });

  it('creates resource-bound layouts with shared name options', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {},
      layout: {
        render: (_props, context) => (
          <span>{`${context.resource}:${context.name}`}</span>
        ),
      },
    });

    const createScopedResourceLayout = createResourceLayout.forResources({
      resources: ['users', 'admins'],
      name: (resource) => `${resource}Test`,
    });
    const UsersPage = createScopedResourceLayout({ resource: 'users' });
    const AdminsPage = createScopedResourceLayout({ resource: 'admins' });

    render(
      <>
        <UsersPage />
        <AdminsPage />
      </>,
    );

    expect(screen.getByText('users:UsersTest')).toBeInTheDocument();
    expect(screen.getByText('admins:AdminsTest')).toBeInTheDocument();
  });

  it('creates a component shared by the scoped resources', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins', 'posts'],
      options: {
        description: createProp.string(),
        title: createProp.string(),
      },
      layout: {
        props: {
          custom: {
            actions: createProp.component({ type: 'ReactNode' }),
          },
        },
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const UsersPage = createDirectoryLayout({
      description: 'Manage users',
      name: 'UsersPage',
      resource: 'users',
      title: 'Users',
    });
    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: {
          actions: 'optional',
          description: 'optional',
          title: true,
        },
        custom: {
          eyebrow: createProp.string().optional(),
        },
      },
      resources: {
        users: {
          render: ({ resource }) => <span>{`custom:${resource}`}</span>,
        },
        admins: {
          render: ({ resource }) => <span>{`custom:${resource}`}</span>,
        },
      },
      render: (
        { actions, children, description, eyebrow, resource, title },
        context,
      ) => {
        const ResourceRender =
          resource === 'users' ? context.Users : context.Admins;

        return (
          <section>
            {eyebrow ? <span>{eyebrow}</span> : null}
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
            {actions}
            {children}
            <ResourceRender title={title} />
          </section>
        );
      },
    });

    render(
      <Directory
        actions={<button type='button'>Create user</button>}
        eyebrow='Directory'
        resource='users'
        title='Users'
      >
        User content
      </Directory>,
    );

    expect(createDirectoryLayout.resources).toBeUndefined();
    expect(UsersPage.resource).toBeUndefined();
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create user' }),
    ).toBeInTheDocument();
    expect(screen.getByText('User content')).toBeInTheDocument();
    expect(screen.getByText('custom:users')).toBeInTheDocument();
  });

  it('preserves resource render state when the scoped component rerenders', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const UsersPage = createDirectoryLayout({
      name: 'UsersPage',
      resource: 'users',
      title: 'Users',
    });

    function StatefulResourceContent() {
      const [count, setCount] = useState(0);

      return (
        <button type='button' onClick={() => setCount((value) => value + 1)}>
          {`Count: ${count}`}
        </button>
      );
    }

    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: {
          title: true,
        },
      },
      resources: {
        users: {
          render: () => <StatefulResourceContent />,
        },
      },
      render: ({ title }, context) => (
        <section>
          <h1>{title}</h1>
          <context.Users title={title} />
        </section>
      ),
    });
    const view = render(<Directory resource='users' title='Users' />);

    fireEvent.click(screen.getByRole('button', { name: 'Count: 0' }));
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();

    view.rerender(<Directory resource='users' title='Updated users' />);

    expect(
      screen.getByRole('heading', { name: 'Updated users' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();
  });

  it('exposes scoped components on the resource render, context, and binding', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }) => (
          <section>
            <h1>{title}</h1>
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const Directory = createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          components: {
            Toolbar: {
              render: ({ title }) => <nav>{`toolbar:${title}`}</nav>,
            },
            Footer: {
              props: { label: createProp.string() },
              render: ({ label, resource }) => (
                <footer>{`footer:${resource}:${label}`}</footer>
              ),
            },
          },
          // Scoped components reach this render through its second argument.
          render: ({ resource }, components) => (
            <div>
              <components.Toolbar />
              <span>{`content:${resource}`}</span>
            </div>
          ),
        },
        admins: {
          render: ({ resource }) => <span>{`content:${resource}`}</span>,
        },
      },
      render: ({ resource, title }, context) => (
        <context.Root>
          {resource === 'users' ? (
            <context.Users title={title} />
          ) : (
            <context.Admins title={title} />
          )}
          {/* And through the resource entry on the main render context. */}
          {resource === 'users' ? <context.Users.Footer label='end' /> : null}
        </context.Root>
      ),
    });

    render(<Directory resource='users' title='Users' />);

    expect(screen.getByText('toolbar:Users')).toBeInTheDocument();
    expect(screen.getByText('content:users')).toBeInTheDocument();
    expect(screen.getByText('footer:users:end')).toBeInTheDocument();

    cleanup();

    // And as statics on a bound component.
    const UsersDirectory = Directory.asHOF()('users');

    render(<UsersDirectory title='Users' />);
    expect(screen.getByText('toolbar:Users')).toBeInTheDocument();

    cleanup();

    render(
      <Directory resource='users' title='Users'>
        <UsersDirectory.Toolbar />
      </Directory>,
    );
    expect(screen.getAllByText('toolbar:Users').length).toBeGreaterThan(0);
  });

  it('mounts returned component types with call-site props and compound statics', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }) => (
          <section>
            <h1>{title}</h1>
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: {
          title: true,
        },
      },
      resources: {
        users: {
          components: {
            DataTable: {
              props: {
                variant: createProp
                  .string()
                  .literal('a')
                  .or(createProp.string().literal('b')),
              },
              render: function UsersDataTable({ variant }) {
                function VariantTable() {
                  return <p>{`table-${variant}`}</p>;
                }

                function VariantTableLoading() {
                  return <p>{`loading-${variant}`}</p>;
                }

                return Object.assign(VariantTable, {
                  Loading: VariantTableLoading,
                });
              },
            },
          },
          render: function UsersContent(_props, components) {
            return function UsersPanel(props: { heading: string }) {
              return (
                <div>
                  <h2>{props.heading}</h2>
                  <components.DataTable variant='b' />
                  <components.DataTable.Loading />
                </div>
              );
            };
          },
        },
      },
      render: function DirectoryRender(_props, context) {
        return function DirectoryShell() {
          return (
            <context.Root>
              <context.Users heading='Directory users' />
            </context.Root>
          );
        };
      },
    });

    render(<Directory resource='users' title='Users' />);

    expect(
      screen.getByRole('heading', { name: 'Directory users' }),
    ).toBeInTheDocument();
    expect(screen.getByText('table-b')).toBeInTheDocument();
    expect(screen.getByText('loading-b')).toBeInTheDocument();
    expect(screen.queryByText('loading-a')).not.toBeInTheDocument();
  });

  it('preserves portals returned from scoped render instead of treating them as components', () => {
    // Portals have $$typeof but are not valid elements — they must not be
    // passed to createElement as a component type.
    const portalRoot = document.createElement('div');
    document.body.appendChild(portalRoot);

    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children }) => <section>{children}</section>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: {
          components: {
            PortalBadge: {
              render: function UsersPortalBadge() {
                return createPortal(<p>ported-badge</p>, portalRoot);
              },
            },
          },
          render: (_props, components) => (
            <div>
              <components.PortalBadge />
            </div>
          ),
        },
      },
      render: (_props, context) => (
        <context.Root>
          <context.Users />
        </context.Root>
      ),
    });

    try {
      render(<Directory resource='users' />);

      expect(portalRoot).toHaveTextContent('ported-badge');
      expect(screen.queryByText('ported-badge')).toBeInTheDocument();
    } finally {
      portalRoot.remove();
    }
  });

  it('validates the props declared by a scoped component', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children }) => <section>{children}</section>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: {
          components: {
            Badge: {
              props: { label: createProp.string() },
              render: ({ label }) => <span>{String(label)}</span>,
            },
          },
          render: (_props, components) => (
            // @ts-expect-error - we're testing for missing props
            <components.Badge />
          ),
        },
      },
      render: (_props, context) => (
        <context.Root>
          <context.Users />
        </context.Root>
      ),
    });

    expect(
      renderCapturingError(<Directory resource='users' />)?.message,
    ).toContain('label');
  });

  it('rejects scoped components using reserved names', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          users: {
            components: { name: { render: () => <nav /> } },
            render: () => <span>users</span>,
          },
        },
        render: () => <section />,
      } as never),
    ).toThrowError(
      'Scoped component "name" for resource "users" uses a reserved name',
    );

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          users: {
            components: { ['__proto__']: { render: () => <nav /> } },
            render: () => <span>users</span>,
          },
        },
        render: () => <section />,
      } as never),
    ).toThrowError(
      'Scoped component "__proto__" for resource "users" uses a reserved name',
    );
  });

  it('validates JSX.Element props on scoped components by their declared names', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children }) => <section>{children}</section>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: {
          components: {
            Widget: {
              props: {
                actions: createProp.component({ type: 'JSX.Element' }),
              },
              render: ({ actions }) => <div>{actions}</div>,
            },
          },
          render: (_props, components) => (
            <components.Widget actions={<button type='button'>Go</button>} />
          ),
        },
      },
      render: (_props, context) => (
        <context.Root>
          <context.Users />
        </context.Root>
      ),
    });

    render(<Directory resource='users' />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();

    cleanup();

    const MissingActions = createDirectoryLayout.createComponent({
      resources: {
        users: {
          components: {
            Widget: {
              props: {
                actions: createProp.component({ type: 'JSX.Element' }),
              },
              render: ({ actions }) => <div>{actions}</div>,
            },
          },
          render: (_props, components) => (
            // @ts-expect-error - we're testing for missing props
            <components.Widget />
          ),
        },
      },
      render: (_props, context) => (
        <context.Root>
          <context.Users />
        </context.Root>
      ),
    });

    expect(
      renderCapturingError(<MissingActions resource='users' />)?.message,
    ).toContain('actions');
  });

  it('keeps createComponent JSX.Element prop names as declared', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        actions: createProp.component({ type: 'JSX.Element' }),
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { actions: true, title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }) => (
          <section>
            <h1>{title}</h1>
            {children}
          </section>
        ),
      },
    });
    const Directory = createResourceLayout
      .forResources('users')
      .createComponent({
        props: {
          include: { actions: true, title: true },
          custom: {
            badge: createProp.component({ type: 'JSX.Element' }),
          },
        },
        resources: {
          users: {
            render: ({ actions, badge }) => (
              <div>
                {actions()}
                {badge}
              </div>
            ),
          },
        },
        render: ({ actions, badge, title }, context) => (
          <context.Root>
            <h2>{title}</h2>
            {actions()}
            {badge}
            <context.Users title={title} actions={actions} badge={badge} />
          </context.Root>
        ),
      });

    render(
      <Directory
        resource='users'
        title='Users'
        actions={() => <button type='button'>Go</button>}
        badge={<span>badge</span>}
      />,
    );

    expect(
      screen.getAllByRole('button', { name: 'Go' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('badge').length).toBeGreaterThan(0);
  });

  it('throws when a scoped component is rendered outside its component', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: {
          components: { Toolbar: { render: () => <nav>toolbar</nav> } },
          render: () => <span>users</span>,
        },
      },
      render: (_props, context) => <context.Users />,
    });
    const EscapedToolbar = Directory.asHOF()('users').Toolbar;

    expect(renderCapturingError(<EscapedToolbar />)?.message).toBe(
      'Scoped component "Toolbar" must be rendered inside its scoped component',
    );
  });

  it('binds a resource with asHOF and accepts the remaining props', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }) => (
          <section>
            <h1>{title}</h1>
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: { title: true },
        custom: { eyebrow: createProp.string().optional() },
      },
      resources: {
        users: {
          render: ({ resource }) => <span>{`content:${resource}`}</span>,
        },
        admins: {
          render: ({ resource }) => <span>{`content:${resource}`}</span>,
        },
      },
      render: ({ eyebrow, resource, title }, context) => (
        <context.Root>
          <p>{`${eyebrow ?? ''}|${title}`}</p>
          {resource === 'users' ? (
            <context.Users title={title} />
          ) : (
            <context.Admins title={title} />
          )}
        </context.Root>
      ),
    });
    const createDirectory = Directory.asHOF();
    const UsersDirectory = createDirectory('users');

    expect(UsersDirectory.resource).toBeUndefined();

    render(<UsersDirectory eyebrow='Directory' title='Users' />);

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Directory|Users')).toBeInTheDocument();
    expect(screen.getByText('content:users')).toBeInTheDocument();
  });

  it('returns a stable bound component for each resource', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {},
      layout: {
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children }) => <section>{children}</section>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );

    function StatefulResourceContent() {
      const [count, setCount] = useState(0);

      return (
        <button type='button' onClick={() => setCount((value) => value + 1)}>
          {`Count: ${count}`}
        </button>
      );
    }

    const Directory = createDirectoryLayout.createComponent({
      props: { custom: { eyebrow: createProp.string().optional() } },
      resources: {
        users: { render: () => <StatefulResourceContent /> },
        admins: { render: () => <span>admins</span> },
      },
      render: ({ eyebrow }, context) => (
        <context.Root>
          <span>{eyebrow}</span>
          <context.Users />
        </context.Root>
      ),
    });
    const createDirectory = Directory.asHOF();

    expect(createDirectory('users')).toBe(createDirectory('users'));
    expect(createDirectory('users')).not.toBe(createDirectory('admins'));
    // A second asHOF() call must not mint a new component type.
    expect(Directory.asHOF()('users')).toBe(createDirectory('users'));

    const UsersDirectory = createDirectory('users');
    const view = render(<UsersDirectory eyebrow='First' />);

    fireEvent.click(screen.getByRole('button', { name: 'Count: 0' }));
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();

    view.rerender(<UsersDirectory eyebrow='Second' />);

    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();
  });

  it('rejects binding a resource outside the scope with asHOF', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: { render: () => <span>users</span> },
      },
      render: (_props, context) => <context.Users />,
    });

    expect(() => Directory.asHOF()('admins' as never)).toThrowError(
      'Resource "admins" is not available in this scoped component',
    );
  });

  it('renders the current resource layout through the render context root', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            actions: createProp.component({ type: 'ReactNode' }).optional(),
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ actions, children, title }) => (
          <section>
            <h1>{title}</h1>
            {actions}
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const UsersPage = createDirectoryLayout({
      name: 'UsersPage',
      resource: 'users',
      title: 'Users',
    });
    const Directory = createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          render: ({ resource }) => <span>{`content:${resource}`}</span>,
        },
        admins: {
          render: ({ resource }) => <span>{`content:${resource}`}</span>,
        },
      },
      render: ({ resource, title }, context) => (
        <context.Root actions={<button type='button'>Create</button>}>
          {resource === 'users' ? (
            <context.Users title={title} />
          ) : (
            <context.Admins title={title} />
          )}
        </context.Root>
      ),
    });

    render(<Directory resource='users' title='Users directory' />);

    expect(
      screen.getByRole('heading', { name: 'Users directory' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByText('content:users')).toBeInTheDocument();
  });

  it('uses call-site layout options for the render context root', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }, context) => (
          <section>
            <h1>{`${context.resource}/${context.name}: ${title}`}</h1>
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources({
      resources: ['users', 'admins'],
      name: (resource) => `${resource}Page`,
    });
    const AdminsPage = createDirectoryLayout({
      resource: 'admins',
      title: 'Admins',
    });
    const Directory = createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          render: () => <span>users</span>,
        },
        admins: {
          render: () => <span>admins</span>,
        },
      },
      render: (_props, context) => (
        <context.Root>
          <span>body</span>
        </context.Root>
      ),
    });

    render(<Directory resource='admins' title='Admins directory' />);

    expect(
      screen.getByRole('heading', {
        name: 'admins/AdminsPage: Admins directory',
      }),
    ).toBeInTheDocument();
  });

  it('throws when the render context root is rendered outside its component', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children }) => <section>{children}</section>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    let EscapedRoot: (props: { children?: ReactNode }) => JSX.Element =
      null as never;
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: { render: () => <span>users</span> },
      },
      render: (_props, context) => {
        EscapedRoot = context.Root;

        return <span>captured</span>;
      },
    });

    render(<Directory resource='users' />);

    expect(renderCapturingError(<EscapedRoot />)?.message).toBe(
      'Render context component "Root" must be rendered inside its scoped component',
    );
  });

  it('throws when the render context root has no entry for the resource', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
        },
        render: ({ title }) => <h1>{title}</h1>,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'admins',
    );
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        users: { render: () => <span>users</span> },
      },
      render: (_props, context) => <context.Root />,
    });

    expect(renderCapturingError(<Directory resource='admins' />)?.message).toBe(
      'Render context component "Root" requires a "resources.admins" entry to build the layout for resource "admins"',
    );
  });

  it('preserves render context root state when the scoped component rerenders', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: { title: true },
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
        render: ({ children, title }) => (
          <section>
            <h1>{title}</h1>
            {children}
          </section>
        ),
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const UsersPage = createDirectoryLayout({
      name: 'UsersPage',
      resource: 'users',
      title: 'Users',
    });

    function StatefulResourceContent() {
      const [count, setCount] = useState(0);

      return (
        <button type='button' onClick={() => setCount((value) => value + 1)}>
          {`Count: ${count}`}
        </button>
      );
    }

    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: { title: true },
        custom: {
          eyebrow: createProp.string().optional(),
        },
      },
      resources: {
        users: {
          render: () => <StatefulResourceContent />,
        },
      },
      render: ({ eyebrow, title }, context) => (
        <context.Root>
          <span>{eyebrow}</span>
          <context.Users title={title} />
        </context.Root>
      ),
    });
    const view = render(
      <Directory eyebrow='First' resource='users' title='Users directory' />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Count: 0' }));
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();

    view.rerender(
      <Directory eyebrow='Second' resource='users' title='Users directory' />,
    );

    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Count: 1' }),
    ).toBeInTheDocument();
  });

  it('rejects colliding capitalized resource render keys', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'Users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'Users',
    );

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          users: { render: () => <section /> },
          Users: { render: () => <section /> },
        },
        render: () => <section />,
      }),
    ).toThrowError(
      'Resources "users" and "Users" both map to render context key "Users"',
    );
  });

  it('ignores capitalized collisions for resources without an entry', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'Users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'users',
      'Users',
    );

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          users: { render: () => <section /> },
        },
        render: () => <section />,
      }),
    ).not.toThrow();
  });

  it('rejects resources that collide with the reserved "Root" context key', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['root'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('root');

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          root: { render: () => <section /> },
        },
        render: () => <section />,
      } as never),
    ).toThrowError(
      'Resource "root" maps to the reserved render context key "Root"',
    );
  });

  it('allows resources named after scoped component option keys', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['render', 'props'],
      options: {},
      layout: {
        render: ({ children }) => <section>{children}</section>,
        props: {
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
          },
        },
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources(
      'render',
      'props',
    );
    const Directory = createDirectoryLayout.createComponent({
      resources: {
        render: { render: () => <span>render content</span> },
        props: { render: () => <span>props content</span> },
      },
      render: ({ resource }, context) => (
        <context.Root>
          {resource === 'render' ? <context.Render /> : <context.Props />}
        </context.Root>
      ),
    });

    render(<Directory resource='render' />);

    expect(screen.getByText('render content')).toBeInTheDocument();
  });

  it('rejects resources outside the scope', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');

    expect(() =>
      createDirectoryLayout.createComponent({
        resources: {
          admins: { render: () => <section /> },
        },
        render: () => <section />,
      } as never),
    ).toThrowError(
      'Resource "admins" is not available in this scoped component',
    );
  });

  it('allows optional scoped component props to be omitted', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        description: createProp.string(),
      },
      layout: {
        render: () => <section />,
      },
    });
    const createDirectoryLayout = createResourceLayout.forResources('users');
    const UsersPage = createDirectoryLayout({
      description: 'Manage users',
      name: 'UsersPage',
      resource: 'users',
    });
    const Directory = createDirectoryLayout.createComponent({
      props: {
        include: {
          description: 'optional',
        },
      },
      render: ({ children, description }) => (
        <section>{description ?? children ?? 'Empty directory'}</section>
      ),
    });

    render(<Directory resource='users' />);

    expect(screen.getByText('Empty directory')).toBeInTheDocument();
  });

  it('creates resource-bound layouts with a selected-resource name map', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins', 'posts'],
      options: {},
      layout: {
        render: (_props, context) => (
          <span>{`${context.resource}:${context.name}`}</span>
        ),
      },
    });

    const createScopedResourceLayout = createResourceLayout.forResources({
      resources: ['users', 'admins'],
      name: {
        users: (resource) => `${resource.toLowerCase()}Page`,
        admins: 'AdminDirectory',
      },
    });
    const UsersPage = createScopedResourceLayout({ resource: 'users' });
    const AdminsPage = createScopedResourceLayout({ resource: 'admins' });

    render(
      <>
        <UsersPage />
        <AdminsPage />
      </>,
    );

    expect(screen.getByText('users:usersPage')).toBeInTheDocument();
    expect(screen.getByText('admins:AdminDirectory')).toBeInTheDocument();
  });

  it('creates resource-bound layouts with per-resource options', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users', 'admins'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props, context) => (
          <span>{`${context.resource}:${context.name}:${props.title}`}</span>
        ),
      },
    });

    const createScopedResourceLayout = createResourceLayout.forResources({
      users: {
        name: (resource) => `${resource.toLowerCase()}Test`,
      },
    });
    const createUsersPage = createScopedResourceLayout
      .forResource({ resource: 'users' })
      .setDefaults({ title: 'Directory' });
    const UsersPage = createUsersPage({});

    render(<UsersPage />);

    expect(screen.getByText('users:usersTest:Directory')).toBeInTheDocument();
  });

  it('allows overriding the default name for a resource-bound layout', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: (_props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    });
    const CustomUsersPage = createUsersPage({
      name: 'CustomUsersPage',
    });

    render(<CustomUsersPage />);

    expect(screen.getByText('CustomUsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('throws when forResource is called without a resource', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });

    expect(() =>
      createResourceLayout.forResource({ name: 'UsersPage' } as never),
    ).toThrowError('"resource" is required when calling "forResource"');
  });

  it('resolves included option props before passing them to render', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        description: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
            description: true,
          },
          custom: {
            children: createProp.component({ type: 'ReactNode' }),
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
            <div>{props.children}</div>
          </section>
        ),
      },
    });

    const UsersPage = createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Users page',
      description: 'Resolved include props should reach render as strings.',
    });

    render(<UsersPage>Body content</UsersPage>);

    expect(
      screen.getByRole('heading', { name: 'Users page' }).textContent,
    ).toBe('Users page');
    expect(
      screen.getByText('Resolved include props should reach render as strings.')
        .textContent,
    ).toBe('Resolved include props should reach render as strings.');
    expect(screen.getByText('Body content').textContent).toBe('Body content');
  });

  it('applies setDefault values when props are omitted', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        description: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
            description: true,
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout
      .forResource({ resource: 'users' })
      .setDefaults({
        title: 'Default title',
        description: 'Default description',
      });
    const UsersPage = createUsersPage({
      name: 'UsersPage',
    });

    render(<UsersPage />);

    expect(
      screen.getByRole('heading', { name: 'Default title' }).textContent,
    ).toBe('Default title');
    expect(screen.getByText('Default description').textContent).toBe(
      'Default description',
    );
  });

  it('creates JSX.Element props at layout creation time with defined props', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        actions: createProp.component({ type: 'JSX.Element' }).props({
          label: createProp.string(),
        }),
      },
      layout: {
        props: {
          include: {
            title: true,
            actions: true,
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <props.Actions label='Create user' />
          </section>
        ),
      },
    });

    const UsersPage = createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Users page',
      Actions: (componentProps) => (
        <button type='button'>{componentProps.label}</button>
      ),
    });

    render(<UsersPage />);

    expect(
      screen.getByRole('heading', { name: 'Users page' }).textContent,
    ).toBe('Users page');
    expect(
      screen.getByRole('button', { name: 'Create user' }).textContent,
    ).toBe('Create user');
  });

  it('allows setDefaults render functions for JSX.Element props', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        actions: createProp.component({ type: 'JSX.Element' }).props({
          label: createProp.string(),
        }),
      },
      layout: {
        props: {
          include: {
            title: true,
            actions: true,
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <props.Actions label='Default action' />
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout
      .forResource({ resource: 'users' })
      .setDefaults({
        title: 'Users page',
        Actions: (props) => <button>{props.label}</button>,
      });
    const UsersPage = createUsersPage({
      name: 'UsersPage',
    });

    render(<UsersPage />);

    expect(
      screen.getByRole('heading', { name: 'Users page' }).textContent,
    ).toBe('Users page');
    expect(
      screen.getByRole('button', { name: 'Default action' }).textContent,
    ).toBe('Default action');
  });

  it('allows callers to transform setDefault values with updaters', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        description: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
            description: true,
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout
      .forResource({ resource: 'users' })
      .setDefaults({
        title: 'Users page',
        description: 'Base description',
      });
    const UsersPage = createUsersPage({
      name: 'UsersPage',
      description: (prev) => `${prev} with suffix`,
    });

    render(<UsersPage />);

    expect(
      screen.getByRole('heading', { name: 'Users page' }).textContent,
    ).toBe('Users page');
    expect(screen.getByText('Base description with suffix').textContent).toBe(
      'Base description with suffix',
    );
  });

  it('allows explicit values to override setDefault values', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props) => <h1>{props.title}</h1>,
      },
    });

    const createUsersPage = createResourceLayout
      .forResource({ resource: 'users' })
      .setDefaults({ title: 'Default title' });
    const UsersPage = createUsersPage({
      name: 'UsersPage',
      title: 'Explicit title',
    });

    render(<UsersPage />);

    expect(
      screen.getByRole('heading', { name: 'Explicit title' }).textContent,
    ).toBe('Explicit title');
  });

  it('passes split render options through the render context', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
            <span>{props.title}</span>
            <span>{String(Object.keys(context.inProps).length)}</span>
          </section>
        ),
      },
    });

    const UsersPage = createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Directory',
    });

    render(<UsersPage />);

    expect(screen.getByText('UsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders defined composable presets with resolved create-time props', () => {
    const createBreadcrumbComposable = defineComposableComponent({
      name: 'Breadcrumbs',
      props: {
        segments: createProp.record({
          value: createProp.string(),
          key: createProp.string().literal('contacts').or(createProp.string()),
        }),
      },
    });

    const Breadcrumbs = createBreadcrumbComposable((props) => (
      <nav aria-label='Breadcrumb'>
        {Object.values(props.segments).join(' / ')}
      </nav>
    ));

    const { createResourceLayout } = defineResourceLayout({
      resources: ['contacts'],
      options: {
        title: createProp.string(),
      },
      layout: {
        composables: () => ({
          ...Breadcrumbs,
        }),
        props: {
          include: {
            title: true,
            segments: true,
          },
        },
        render: (props, { composables }) => (
          <section>
            <composables.Breadcrumbs segments={props.segments} />
            <h1>{props.title}</h1>
            <p>{Object.values(props.segments).join(' / ')}</p>
          </section>
        ),
      },
    });

    const ContactsPage = createResourceLayout({
      resource: 'contacts',
      name: 'ContactsPage',
      title: 'Single Male Records',
      segments: {
        contacts: 'Contacts',
        'single-male': 'Single Males',
      },
    });

    render(<ContactsPage />);

    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent(
      'Contacts / Single Males',
    );
    expect(
      screen.getByRole('heading', { name: 'Single Male Records' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('paragraph')).toHaveTextContent(
      'Contacts / Single Males',
    );
  });

  describe('createResourceLayout.makeComposable', () => {
    it('returns a ComposableResourceLayout with the layout name and composables', () => {
      const { createResourceLayout } = createContactsComposableLayout();

      const ContactSection = createResourceLayout.makeComposable({
        resource: 'contacts',
        name: 'ContactSection',
        title: 'Contact',
        segments: {
          contacts: 'Contacts',
        },
      });

      expect(ContactSection.displayName).toBe('ContactSection');
      expect(ContactSection.Breadcrumbs.displayName).toBe('Breadcrumbs');
    });

    it('is retained on factories returned by forResources', () => {
      const { createResourceLayout } = createContactsComposableLayout();
      const createScopedResourceLayout = createResourceLayout.forResources({
        resources: ['contacts'],
        name: {
          contacts: 'ContactSection',
        },
      });

      const ContactSection = createScopedResourceLayout.makeComposable({
        resource: 'contacts',
        title: 'Contact',
        segments: {
          contacts: 'Contacts',
        },
      });

      expect(ContactSection.displayName).toBe('ContactSection');
      expect(ContactSection.Breadcrumbs.displayName).toBe('Breadcrumbs');
      expect(createScopedResourceLayout).not.toHaveProperty('forResources');
    });

    it('matches createResourceLayout(...).makeComposable()', () => {
      const { createResourceLayout } = createContactsComposableLayout();
      const layoutOptions = {
        resource: 'contacts' as const,
        name: 'ContactSection',
        title: 'Contact',
        segments: {
          contacts: 'Contacts',
        },
      };

      const fromTopLevel = createResourceLayout.makeComposable(layoutOptions);
      const fromLayout = createResourceLayout(layoutOptions).makeComposable();

      expect(fromTopLevel.displayName).toBe(fromLayout.displayName);
      expect(fromTopLevel.Breadcrumbs.displayName).toBe(
        fromLayout.Breadcrumbs.displayName,
      );
    });

    it('is not available when the layout has no composables', () => {
      const { createResourceLayout } = createTestResourceLayout();

      expect('makeComposable' in createResourceLayout).toBe(false);
    });

    it('allows per-layout makeComposable to override the composable name', () => {
      const { createResourceLayout } = createContactsComposableLayout();
      const ContactsPage = createResourceLayout({
        resource: 'contacts',
        name: 'ContactsPage',
        title: 'Directory',
        segments: {
          contacts: 'Contacts',
        },
      });

      const UserDetailPage = ContactsPage.makeComposable({
        name: 'UserDetailPage',
      });

      expect(ContactsPage.displayName).toBe('ContactsPage');
      expect(UserDetailPage.displayName).toBe('UserDetailPage');
      expect(UserDetailPage.Breadcrumbs.displayName).toBe('Breadcrumbs');
    });
  });
});
