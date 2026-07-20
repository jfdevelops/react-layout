import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createProp,
  createComposableComponent,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';

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
