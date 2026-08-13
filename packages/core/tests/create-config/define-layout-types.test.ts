import type { JSX, ReactNode } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import {
  createProp,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';
import { testResourceLayout } from './helpers';

const { createResourceLayout } = testResourceLayout({
  resources: ['admins'],
  options: {
    description: createProp.string(),
    title: createProp.string(),
  },
  layout: {
    render: () => null as never,
  },
});

const createDirectoryLayout = createResourceLayout.forResources(
  'users',
  'admins',
);

describe('defineResourceLayout types', () => {
  it('requires at least one resource for forResources', () => {
    // @ts-expect-error forResources requires at least one resource
    defineResourceLayout.forResources();
  });

  it('types forResource names and rejects invalid selections', () => {
    const NamedUsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: (resource) => `${resource}Page`,
    })({
      title: 'Users',
      description: 'Manage users',
    });

    expectTypeOf(NamedUsersPage.displayName).toEqualTypeOf<'UsersPage'>();
    expectTypeOf(NamedUsersPage.resource).toEqualTypeOf<'users'>();

    // Negative cases are wrapped so they typecheck without executing.
    () => {
      // @ts-expect-error unknown resources cannot be used
      createResourceLayout.forResource('comments');
    };
    () => {
      // @ts-expect-error keyed notation accepts exactly one resource
      createResourceLayout.forResource({ users: {}, admins: {} });
    };
    () => {
      // @ts-expect-error name callbacks must return strings
      createResourceLayout.forResource({ resource: 'users', name: () => 123 });
    };
  });

  it('types forResources selection and omits nested factories', () => {
    const layouts = createResourceLayout.forResources('users', 'admins');
    const UsersPage = layouts({
      resource: 'users',
      name: 'UsersPage',
      title: 'Users',
      description: 'Manage users',
    });

    expectTypeOf(UsersPage.resource).toEqualTypeOf<'users'>();
    expectTypeOf(layouts.resources).toEqualTypeOf<'users' | 'admins'>();

    () => {
      // @ts-expect-error a name is required when no default was configured
      layouts({ resource: 'users' });
    };
    () => {
      // @ts-expect-error unselected resources cannot be used
      layouts({ resource: 'posts', name: 'PostsPage' });
    };
    () => {
      // @ts-expect-error forResources is intentionally omitted from scoped factories
      layouts.forResources;
    };
    () => {
      // @ts-expect-error unknown resource argument
      createResourceLayout.forResources('comments');
    };
  });

  it('merges optional extra resources from defineResourceLayout.forResources', () => {
    const { createResourceLayout: extended } = testResourceLayout({
      resources: ['admins'],
      layout: { render: () => null as never },
    });
    const AdminsPage = extended.forResource('admins')();
    const UsersPage = extended.forResource('users')();

    expectTypeOf(AdminsPage.resource).toEqualTypeOf<'admins'>();
    expectTypeOf(UsersPage.resource).toEqualTypeOf<'users'>();
  });

  it('forwards optional includes from the factory to the call site', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['detail', 'create'],
      options: {
        title: createProp.string(),
      },
      layout: {
        composables: () => {
          const Breadcrumb = defineComposableComponent({
            name: 'Breadcrumb',
            props: {
              segments: createProp.record({
                value: createProp.string(),
                key: createProp.string(),
              }),
            },
          })(() => null as never);

          return { ...Breadcrumb };
        },
        props: {
          include: {
            title: true,
            segments: 'optional',
          },
          custom: {
            children: createProp.component({ type: 'ReactNode' }),
          },
        },
        render: (props) => {
          expectTypeOf(props.title).toEqualTypeOf<string>();
          expectTypeOf(props.segments).toEqualTypeOf<
            Record<string, string> | undefined
          >();
          return null as never;
        },
      },
    });

    const DetailPane = createResourceLayout.forResource({
      resource: 'detail',
    })({
      name: 'DetailPane',
      title: 'Appointment',
    });

    expectTypeOf(DetailPane).toBeCallableWith({
      children: null as never,
    });
    expectTypeOf(DetailPane).toBeCallableWith({
      children: null as never,
      segments: { name: 'Test Test' },
    });

    () => {
      // @ts-expect-error title remains required at the factory
      createResourceLayout.forResource({ resource: 'detail' })({
        name: 'MissingTitle',
      });
    };
  });

  it('preserves include visibility and passthrough through scoped factories', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['detail', 'create'],
      options: {
        title: createProp.string(),
        componentLabel: createProp.string(),
        configLabel: createProp.string(),
        requiredComponentLabel: createProp.string(),
        requiredConfigLabel: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
            componentLabel: {
              visibility: 'optional',
              passthrough: 'component',
            },
            configLabel: {
              visibility: 'optional',
              passthrough: 'config',
            },
            requiredComponentLabel: {
              visibility: 'required',
              passthrough: 'component',
            },
            requiredConfigLabel: {
              visibility: 'required',
              passthrough: 'config',
            },
          },
        },
        render: (props) => {
          expectTypeOf(props.title).toEqualTypeOf<string>();
          expectTypeOf(props.componentLabel).toEqualTypeOf<
            string | undefined
          >();
          expectTypeOf(props.configLabel).toEqualTypeOf<string | undefined>();
          expectTypeOf(props.requiredComponentLabel).toEqualTypeOf<string>();
          expectTypeOf(props.requiredConfigLabel).toEqualTypeOf<string>();
          return null as never;
        },
      },
    });
    const createPane = createResourceLayout.forResources('create', 'detail');
    const Pane = createPane({
      resource: 'create',
      name: 'Pane',
      title: 'Appointment',
      requiredConfigLabel: 'Configured',
    });

    expectTypeOf(Pane).toBeCallableWith({
      requiredComponentLabel: 'Rendered',
    });
    expectTypeOf(Pane).toBeCallableWith({
      componentLabel: 'Optional render value',
      requiredComponentLabel: 'Rendered',
    });

    () => {
      // @ts-expect-error required component passthrough props stay required
      Pane({});
    };
    () => {
      Pane({
        requiredComponentLabel: 'Rendered',
        // @ts-expect-error config passthrough props are not component props
        configLabel: 'Configured',
      });
    };
    () => {
      // @ts-expect-error required config passthrough props stay required
      createPane({
        resource: 'create',
        name: 'MissingRequiredConfig',
        title: 'Appointment',
      });
    };
    () => {
      createPane({
        resource: 'create',
        name: 'ComponentPropAtConfig',
        title: 'Appointment',
        requiredConfigLabel: 'Configured',
        // @ts-expect-error component passthrough props are not config props
        componentLabel: 'Rendered',
      });
    };
  });
});

describe('createComponent types', () => {
  const Directory = createDirectoryLayout.createComponent({
    props: {
      include: {
        title: true,
      },
      custom: {
        eyebrow: createProp.string().optional(),
      },
    },
    resources: {
      users: {
        render: (props) => {
          expectTypeOf(props.resource).toEqualTypeOf<'users'>();
          return null as never;
        },
      },
      admins: {
        render: (props) => {
          expectTypeOf(props.resource).toEqualTypeOf<'admins'>();
          return null as never;
        },
      },
    },
    render: (props, context) => {
      expectTypeOf(props.title).toEqualTypeOf<string>();
      expectTypeOf(props.resource).toEqualTypeOf<'users' | 'admins'>();
      expectTypeOf(props.eyebrow).toEqualTypeOf<string | undefined>();
      expectTypeOf(context.Users).toBeFunction();
      expectTypeOf(context.Admins).toBeFunction();
      return null as never;
    },
  });

  it('requires included props and rejects out-of-scope resources', () => {
    expectTypeOf(Directory).toBeCallableWith({
      resource: 'users' as const,
      title: 'Users',
    });

    () => {
      // @ts-expect-error required included props remain required at the call site
      Directory({ resource: 'users' });
    };
    () => {
      // @ts-expect-error resources outside the scope are rejected by the resource prop
      Directory({ resource: 'posts', title: 'Posts' });
    };
    () => {
      createDirectoryLayout.createComponent({
        // @ts-expect-error include only accepts props from the layout definition
        props: { include: { missing: true } },
        render: () => null as never,
      });
    };
    () => {
      createDirectoryLayout.createComponent({
        // @ts-expect-error custom renders only accept selected resource keys
        resources: { posts: { render: () => null as never } },
        render: () => null as never,
      });
    };
  });

  it('omits undeclared resources from context and drops resource on asHOF()', () => {
    createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: { render: () => null as never },
      },
      render: (_props, context) => {
        expectTypeOf(context.Users).toBeFunction();
        () => {
          // @ts-expect-error admins has no entry, so it is absent from the context
          context.Admins;
        };
        return null as never;
      },
    });

    const UsersDirectory = Directory.asHOF()('users');
    expectTypeOf(UsersDirectory.resource).toEqualTypeOf<'users'>();
    expectTypeOf(UsersDirectory).toBeCallableWith({ title: 'Users' });

    () => {
      // @ts-expect-error the bound component no longer accepts a resource prop
      UsersDirectory({ resource: 'users', title: 'Users' });
    };
    () => {
      // @ts-expect-error resources outside the scope cannot be bound
      Directory.asHOF()('posts');
    };
  });

  it('types scoped sibling components and rejects reserved shapes', () => {
    createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          components: {
            Toolbar: {
              render: (_props, components) => {
                expectTypeOf(components.Footer).toBeFunction();
                () => {
                  // @ts-expect-error a scoped component is omitted from its own siblings
                  components.Toolbar;
                };
                return null as never;
              },
            },
            Footer: {
              props: { label: createProp.string() },
              render: () => null as never,
            },
          },
          render: (_props, components) => {
            expectTypeOf(components.Footer).toBeCallableWith({ label: 'x' });
            () => {
              // @ts-expect-error Footer requires its declared label prop
              components.Footer({});
            };
            return null as never;
          },
        },
        admins: { render: () => null as never },
      },
      render: (_props, context) => {
        expectTypeOf(context.Users.Footer).toBeCallableWith({ label: 'x' });
        () => {
          // @ts-expect-error admins declared no scoped components
          context.Admins.Footer;
        };
        return null as never;
      },
    });

    () => {
      // @ts-expect-error resource entries reject layout option fields like title
      createDirectoryLayout.createComponent({
        resources: {
          users: {
            title: 'Users',
            render: () => null as never,
          },
        },
        render: () => null as never,
      });
    };
    () => {
      // @ts-expect-error the shared render function is required
      createDirectoryLayout.createComponent({
        resources: { users: { render: () => null as never } },
      });
    };
  });

  it('infers call-site props from returned component types', () => {
    const ReturnedDirectory = createDirectoryLayout.createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          components: {
            DataTable: {
              render: function UsersDataTable() {
                function Table(props: { caption: string; rows: number }) {
                  void props;
                  return null as never;
                }
                function Loading() {
                  return null as never;
                }
                return Object.assign(Table, { Loading });
              },
            },
          },
          render: (_props, components) => {
            expectTypeOf(components.DataTable).toBeCallableWith({
              caption: 'x',
              rows: 1,
            });
            expectTypeOf(components.DataTable.Loading).toBeFunction();
            () => {
              // @ts-expect-error DataTable requires props from the returned component
              components.DataTable({});
            };
            return null as never;
          },
        },
      },
      render: (_props, context) => {
        expectTypeOf(context.Users.DataTable).toBeCallableWith({
          caption: 'x',
          rows: 2,
        });
        expectTypeOf(context.Users.DataTable.Loading).toBeFunction();
        return null as never;
      },
    });

    const BoundUsers = ReturnedDirectory.asHOF()('users');
    expectTypeOf(BoundUsers.DataTable).toMatchTypeOf<
      ((props: { caption: string; rows: number }) => JSX.Element) & {
        Loading: () => JSX.Element;
      }
    >();
  });

  it('keeps declared prop keys uncapitalized for JSX.Element slots', () => {
    const { createResourceLayout: createJsxSlotLayout } = testResourceLayout({
      options: {
        actions: createProp.component({ type: 'JSX.Element' }),
        title: createProp.string(),
      },
      layout: {
        props: { include: { actions: true, title: true } },
        render: () => null as never,
      },
    });
    const JsxSlotDirectory = createJsxSlotLayout
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
            render: (props) => {
              expectTypeOf(props.actions).toEqualTypeOf<() => JSX.Element>();
              expectTypeOf(props.badge).toEqualTypeOf<JSX.Element>();
              () => {
                // @ts-expect-error declared keys are not capitalized
                props.Actions;
              };
              return null as never;
            },
          },
        },
        render: (props) => {
          expectTypeOf(props.actions).toEqualTypeOf<() => JSX.Element>();
          () => {
            // @ts-expect-error declared keys are not capitalized
            props.Badge;
          };
          return null as never;
        },
      });

    expectTypeOf(JsxSlotDirectory).toBeCallableWith({
      resource: 'users' as const,
      title: 'Users',
      actions: (() => null as never) as () => JSX.Element,
      badge: null as never as JSX.Element,
    });

    () => {
      JsxSlotDirectory({
        resource: 'users',
        title: 'Users',
        // @ts-expect-error call site uses the declared key, not Actions
        Actions: () => null as never,
        badge: null as never,
      });
    };
  });

  it('types setProps base props and forbids redefining them', () => {
    const createSharedDirectory = createDirectoryLayout.createComponent.setProps(
      {
        include: { title: true },
        custom: { heading: createProp.string() },
      },
    );
    const sharedUsersEntry = createSharedDirectory.createResourceComponents({
      resource: 'users',
      props: { include: { description: 'optional' } },
      render: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();
        expectTypeOf(props.heading).toEqualTypeOf<string>();
        expectTypeOf(props.description).toEqualTypeOf<string | undefined>();
        () => {
          // @ts-expect-error title is string (not any)
          props.title.definitelyNotAMethod();
        };
        return null as never;
      },
    });

    () => {
      createSharedDirectory.createResourceComponents({
        resource: 'users',
        // @ts-expect-error setProps already defined title
        props: { include: { title: true } },
        render: () => null as never,
      });
    };

    const SharedDirectory = createSharedDirectory({
      resources: { users: sharedUsersEntry },
      render: (props, context) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();
        expectTypeOf(props.heading).toEqualTypeOf<string>();
        expectTypeOf(context.Users).toMatchTypeOf<
          (props: {
            title: string;
            heading: string;
            description?: string;
            children?: ReactNode;
          }) => JSX.Element
        >();
        return null as never;
      },
    });

    expectTypeOf(SharedDirectory).toBeCallableWith({
      resource: 'users' as const,
      title: 'Users',
      heading: 'Team',
    });

    () => {
      // @ts-expect-error heading from setProps custom remains required
      SharedDirectory({ resource: 'users', title: 'Users' });
    };
    () => {
      // @ts-expect-error setProps already defined title on the thunk
      createSharedDirectory({
        props: { include: { title: true } },
        render: () => null as never,
      });
    };
  });

  it('optionalizes defined props from setProps resource entries', () => {
    const createWithTitle = createDirectoryLayout.createComponent.setProps({
      include: { title: true },
    });
    const usersEntry = createWithTitle.createResourceComponents({
      resource: 'users',
      props: { defined: { title: 'Users' } },
      render: ({ title }) => {
        expectTypeOf(title).toEqualTypeOf<string>();
        return null as never;
      },
    });
    expectTypeOf(usersEntry.props).toEqualTypeOf<{
      readonly defined: { readonly title: 'Users' };
    }>();
    const Users = createWithTitle({
      resources: { users: usersEntry },
      render: (_props, context) => context.Users({}),
    }).asHOF()('users');

    () => {
      Users({});
      Users({ title: 'Override' });
    };
  });

  it('types resource entry props, defaults, and direct entry creation', () => {
    const usersEntry = createDirectoryLayout.createResourceComponents({
      resource: 'users',
      props: {
        defined: { title: 'Users' },
      },
      render: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();
        return null as never;
      },
    });
    const DefinedDirectory = createDirectoryLayout.createComponent({
      resources: {
        users: usersEntry,
      },
      render: ({ title }, context) => {
        expectTypeOf(title).toEqualTypeOf<string>();
        expectTypeOf(context.Users).toBeCallableWith({});
        expectTypeOf(context.Users).toBeCallableWith({ title: 'Override' });
        return null as never;
      },
    });
    const DefinedUsers = DefinedDirectory.asHOF()('users');

    () => {
      DefinedDirectory({ resource: 'users' });
      DefinedUsers({});
      DefinedUsers({ title: 'Override' });
    };

    () => {
      createDirectoryLayout.createResourceComponents({
        // @ts-expect-error resource is outside the forResources selection
        resource: 'posts',
        render: () => null as never,
      });
    };
    () => {
      createDirectoryLayout.createResourceComponents({
        resource: 'users',
        props: {
          // @ts-expect-error defined keys must be available layout props
          defined: { missing: 'nope' },
        },
        render: () => null as never,
      });
    };
    () => {
      // @ts-expect-error layout values belong under props.defined
      createDirectoryLayout.createComponent({
        resources: {
          users: {
            title: 'Users',
            render: () => null as never,
          },
        },
        render: () => null as never,
      });
    };
  });

});
