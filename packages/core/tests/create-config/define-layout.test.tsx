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
  it('throws when the resource is not declared in the layout', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(() =>
      createResourceLinks({ invalid: { label: 'Invalid' } } as never),
    ).toThrowError('[createResourceLinks]: Invalid resource: invalid');
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

  it('prefixes the resource name with /# by default', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(createResourceLinks({ users: { label: 'Users' } })).toEqual([
      { href: '/#users', label: 'Users' },
    ]);
  });

  it('prefixes anchor links without a custom href with /#resource', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: { label: 'Users', type: 'anchor' },
      }),
    ).toEqual([{ href: '/#users', label: 'Users' }]);
  });

  it('strips leading slashes and hashes from anchor string hrefs before prefixing', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: { label: 'Users', type: 'anchor', href: '/#/custom-path' },
      }),
    ).toEqual([{ href: '/#custom-path', label: 'Users' }]);
  });

  it('resolves anchor hrefs from a function and prefixes the result', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          type: 'anchor',
          href: (resource) => `custom-${resource}`,
        },
      }),
    ).toEqual([{ href: '/#custom-users', label: 'Users' }]);
  });

  it('strips leading slashes and hashes from function anchor hrefs before prefixing', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          type: 'anchor',
          href: () => '/#/from-function',
        },
      }),
    ).toEqual([{ href: '/#from-function', label: 'Users' }]);
  });

  it('maps each resource entry to a link', () => {
    const { createResourceLinks } = createTestResourceLayout();

    expect(
      createResourceLinks({
        users: { label: 'Users' },
        posts: { label: 'Posts', type: 'anchor' },
      }),
    ).toEqual([
      { href: '/#users', label: 'Users' },
      { href: '/#posts', label: 'Posts' },
    ]);
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
      } as never);

      expect(ContactsPage.displayName).toBe('ContactsPage');
      expect(UserDetailPage.displayName).toBe('UserDetailPage');
      expect(UserDetailPage.Breadcrumbs.displayName).toBe('Breadcrumbs');
    });
  });
});
