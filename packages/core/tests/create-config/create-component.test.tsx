import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { createProp, defineResourceLayout } from '../../src';
import { renderCapturingError, testResourceLayout, testResourceLayoutWithRender } from './helpers';

describe('createComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates a component shared by the scoped resources', () => {
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
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

    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayoutWithRender;
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayoutWithRender;
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
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
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
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
    const { createResourceLayout } = testResourceLayout({
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

  it('shares createComponent props via setProps and createResourceComponents', () => {
    const { createResourceLayout } = testResourceLayout({
      resources: ['admins'],
      options: {
        description: createProp.string(),
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            description: 'optional',
            title: true,
          },
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
    const createShared = createDirectoryLayout.createComponent.setProps({
      include: {
        title: true,
      },
      custom: {
        heading: createProp.string(),
      },
    });
    const usersEntry = createShared.createResourceComponents({
      resource: 'users',
      props: {
        include: {
          description: 'optional',
        },
      },
      render: ({ title, heading, description }) => (
        <div>
          <p>{`${heading}:${title}`}</p>
          <nav>{`${title}:${description ?? 'none'}`}</nav>
          <span>{description ?? 'no-description'}</span>
        </div>
      ),
    });
    const Directory = createShared({
      props: {
        include: {
          description: 'optional',
        },
      },
      resources: {
        users: usersEntry,
        admins: {
          render: ({ title, heading }) => (
            <p>{`admins:${heading}:${title}`}</p>
          ),
        },
      },
      render: ({ children, resource, title, heading, description }, context) => (
        <context.Root>
          {children}
          {resource === 'users' ? (
            <context.Users
              title={title}
              heading={heading}
              description={description}
            />
          ) : (
            <context.Admins title={title} heading={heading} />
          )}
        </context.Root>
      ),
    });

    const { rerender } = render(
      <Directory
        resource='users'
        title='Users'
        heading='Team'
        description='Bio'
      />,
    );

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Team:Users')).toBeInTheDocument();
    expect(screen.getByText('Users:Bio')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();

    rerender(<Directory resource='admins' title='Admins' heading='Staff' />);

    expect(screen.getByRole('heading', { name: 'Admins' })).toBeInTheDocument();
    expect(screen.getByText('admins:Staff:Admins')).toBeInTheDocument();
  });
});
