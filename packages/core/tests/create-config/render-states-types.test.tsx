import { expectTypeOf, it } from 'vitest';
import {
  createDefinedResourceLayout,
  createPropsFromComponent,
  createComposableComponent,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';
import { z } from 'zod';

it('contextually types inline state render arguments', () => {
  const sourceDefinition = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: {
        default: () => <></>,
        Loading: () => <></>,
      },
    },
  });
  const Source = sourceDefinition.createResourceLayout({
    resource: 'users',
    name: 'Source',
  });

  const { createRenderState, defineResourceLayout: defineTargetLayout } =
    createDefinedResourceLayout({
      resources: ['users'],
    });
  const Preview = createRenderState({
    state: 'Preview',
    composables: () => ({
      Layout: createComposableComponent({
        name: 'TargetLayout',
      }),
      Loading: Source.Loading,
    }),
    render: (props, { composables }) => {
      expectTypeOf(props).not.toBeAny();
      expectTypeOf(composables).not.toBeAny();
      expectTypeOf(composables.Layout).toBeFunction();
      expectTypeOf(composables.Loading).toBeFunction();

      return <></>;
    },
  });

  defineTargetLayout({
    render: {
      default: () => <></>,
      ...Preview,
    },
  });
});

it('infers included option props independently for built-in inline states', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
      message: z.string(),
    },
    layout: {
      render: {
        default: {
          props: {
            include: {
              title: true,
            },
          },
          render: ({ title }) => {
            expectTypeOf(title).toEqualTypeOf<string>();

            return <h1>{title}</h1>;
          },
        },
        Loading: {
          props: {
            include: {
              message: true,
            },
          },
          render: ({ message }) => {
            expectTypeOf(message).toEqualTypeOf<string>();

            return <p>{message}</p>;
          },
        },
        NotFound: () => <p>Missing</p>,
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Title',
    message: 'Loading',
  });

  expectTypeOf(Users.Loading).toBeFunction();
  expectTypeOf(Users.NotFound).toBeFunction();
  // @ts-expect-error Error was not configured on this layout.
  Users.Error;
});

it('uses default-state props for the root component contract', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
    layout: {
      render: {
        default: {
          props: {
            include: {
              title: {
                required: true,
                suppliedVia: 'component',
              },
            },
            custom: {
              label: z.string(),
            },
          },
          render: ({ label, title }) => <h1>{`${title}: ${label}`}</h1>,
        },
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expectTypeOf(Users).toBeCallableWith({
    label: 'List',
    title: 'Users',
  });

  () => {
    // @ts-expect-error default-state custom props remain required on the root.
    <Users title='Users' />;
    // @ts-expect-error included component props remain required on the root.
    <Users label='List' />;
  };
});

it('preserves render-state members through withLayout', () => {
  const definition = defineResourceLayout.withLayout({
    resources: ['users'],
    shell: {
      render: (_props, { children }) => <main>{children}</main>,
    },
    layout: {
      render: {
        default: () => <p>Users</p>,
        Loading: () => <p>Loading users</p>,
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expectTypeOf(Users.Loading).toBeFunction();
});

it('infers included option props through a bound layout factory', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
      message: z.string(),
    },
  });

  defineBoundLayout({
    render: {
      default: {
        props: {
          include: {
            title: true,
          },
        },
        render: ({ title }) => {
          expectTypeOf(title).toEqualTypeOf<string>();

          return <h1>{title}</h1>;
        },
      },
      Loading: {
        props: {
          include: {
            message: true,
          },
        },
        render: ({ message }) => {
          expectTypeOf(message).toEqualTypeOf<string>();

          return <p>{message}</p>;
        },
      },
    },
  });
});

it('carries defined options and typed composables through the factory', () => {
  const createSharedMessage = defineComposableComponent({
    name: 'SharedMessage',
    props: {
      message: z.string(),
    },
  });
  const SharedMessage = createSharedMessage(() => <></>);
  const { createRenderState, defineResourceLayout: defineBoundLayout } =
    createDefinedResourceLayout({
      resources: ['users'],
      options: {
        title: z.string(),
      },
      composables: (create) => ({
        ...SharedMessage,
        Layout: create({
          name: ({ resource }) => {
            expectTypeOf(resource).toEqualTypeOf<'users'>();

            return 'Layout';
          },
        }),
      }),
    });
  const Loading = createRenderState({
    state: 'Loading',
    composables: (create) => ({
      LoadingFrame: create({
        name: 'LoadingFrame',
      }),
      LoadingMessage: createComposableComponent({
        name: 'LoadingMessage',
      }),
    }),
    props: {
      include: {
        message: true,
        title: true,
      },
    },
    render: ({ message, title }, { composables: stateComposables }) => {
      expectTypeOf(message).toEqualTypeOf<string>();
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(stateComposables.Layout).toBeFunction();
      expectTypeOf(stateComposables.SharedMessage).toBeFunction();
      expectTypeOf(stateComposables.LoadingFrame).toBeFunction();

      return (
        <stateComposables.LoadingMessage>
          {message}: {title}
        </stateComposables.LoadingMessage>
      );
    },
  });
  const { createResourceLayout } = defineBoundLayout({
    render: {
      default: () => <></>,
      ...Loading,
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    message: 'Still working',
    title: 'Loading users',
  });

  expectTypeOf(Users.Loading).toBeCallableWith({});

  const invalidOptions1 = {
    state: 'Invalid',
    props: {
      include: {
        missing: true,
      },
    },
    render: () => <></>,
  } as const;

  // @ts-expect-error only defined options and state composable props are includable
  createRenderState(invalidOptions1);
});

it('types compound render states independently', () => {
  const { createRenderState, defineResourceLayout: defineBoundLayout } =
    createDefinedResourceLayout({
      resources: ['users'],
    });
  const ErrorState = createRenderState({
    state: 'Error',
    props: {
      custom: {
        error: z.string(),
      },
    },
    render: ({ error }, { retry }) => {
      expectTypeOf(error).toEqualTypeOf<string>();
      expectTypeOf(retry).toEqualTypeOf<(() => void) | undefined>();

      return <></>;
    },
  });
  const { createResourceLayout } = defineBoundLayout({
    render: {
      default: () => <></>,
      ...ErrorState,
      Loading: () => <></>,
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expectTypeOf(Users).toBeCallableWith({});
  expectTypeOf(Users.Error).toBeCallableWith({
    error: 'Failed',
  });
  expectTypeOf(Users.Loading).toBeCallableWith({});

  () => {
    // @ts-expect-error Error owns its required state-specific prop.
    Users.Error({});
  };
});

it('types dot-delimited nested lazy resource paths', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: [
      {
        value: 'admin',
        subResources: [
          {
            value: 'users',
            subResources: ['detail'],
          },
        ],
      },
    ],
  });

  defineBoundLayout.lazy({
    resource: 'admin.users.detail',
    load: async () => ({
      Example: (() => null) as never,
    }),
  });

  () => {
    defineBoundLayout.lazy({
      // @ts-expect-error unknown nested resource path
      resource: 'admin.posts',
      load: async () => ({
        Example: (() => null) as never,
      }),
    });
  };
});

it('does not expose synchronous metadata on lazy resource proxies', () => {
  const loadedDefinition = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: () => <p>Users</p>,
    },
  });
  const LoadedUsers = loadedDefinition.createResourceLayout({
    resource: 'users',
    name: 'LoadedUsers',
  });
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
  });
  const Users = defineBoundLayout.lazy({
    resource: 'users',
    load: async () => ({
      LoadedUsers,
    }),
  });

  () => {
    // @ts-expect-error lazy proxies cannot synchronously expose resource metadata.
    Users.resource;
    // @ts-expect-error lazy proxies cannot lift validators before loading.
    createPropsFromComponent(Users);
  };
});

it('lifts included component props with their call-site optionality', () => {
  const sourceDefinition = defineResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
    layout: {
      props: {
        include: {
          title: {
            required: false,
            suppliedVia: 'component',
          },
        },
      },
      render: () => <></>,
    },
  });
  const Source = sourceDefinition.createResourceLayout({
    resource: 'users',
    name: 'Source',
  });
  const lifted = createPropsFromComponent(Source).pick('title');
  const targetDefinition = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: {
        custom: lifted,
      },
      render: () => <></>,
    },
  });
  const Target = targetDefinition.createResourceLayout({
    resource: 'users',
    name: 'Target',
  });

  expectTypeOf(Target).toBeCallableWith({});
  expectTypeOf(Target).toBeCallableWith({
    title: 'Optional title',
  });
});

it('rejects invalid render-state values across layout entry points', () => {
  const invalidStates = {
    default: () => <></>,
    Preview: 123,
  };
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
  });

  () => {
    defineResourceLayout({
      resources: ['users'],
      layout: {
        // @ts-expect-error custom states must be render callbacks or definitions
        render: invalidStates,
      },
    });
    defineBoundLayout({
      // @ts-expect-error bound layouts validate custom state entries too
      render: invalidStates,
    });
    defineResourceLayout.forResources('users')({
      layout: {
        // @ts-expect-error multi-resource layouts validate custom state entries
        render: invalidStates,
      },
    });
    defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        render: (_props, { children }) => <>{children}</>,
      },
      layout: {
        // @ts-expect-error shell layouts validate custom state entries
        render: invalidStates,
      },
    });
  };
});

it('validates definitions with explicit state names', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
  });
  () => {
    const invalidOptions2 = {
      render: {
        default: () => <></>,
        Preview: {
          state: 'Preview',
          render: 123,
        },
      },
    } as const;

    // @ts-expect-error a state name cannot bypass validation of its render callback
    defineBoundLayout(invalidOptions2);
    defineBoundLayout({
      // @ts-expect-error an empty map suggests states but still requires a default render
      render: {},
    });
  };
});

it('infers custom inline states from the complete render map', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
  });
  const definition = defineBoundLayout({
    render: {
      default: () => <></>,
      Preview: {
        props: {
          include: {
            title: {
              required: true,
              suppliedVia: 'component',
            },
          },
          custom: {
            count: z.number(),
          },
        },
        composables: () => ({
          Frame: createComposableComponent({
            name: 'PreviewFrame',
          }),
        }),
        render: ({ title, count }, { composables }) => {
          expectTypeOf(title).toEqualTypeOf<string>();
          expectTypeOf(count).toEqualTypeOf<number>();
          expectTypeOf(composables.Frame).not.toBeAny();
          // @ts-expect-error only this state's composables are available
          composables.Unknown;

          return (
            <composables.Frame>
              {title}: {count}
            </composables.Frame>
          );
        },
      },
      Empty: {
        props: {
          custom: {
            message: z.string(),
          },
        },
        render: ({ message }) => {
          expectTypeOf(message).toEqualTypeOf<string>();

          return <p>{message}</p>;
        },
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  expectTypeOf(Users).toBeCallableWith({});
  expectTypeOf(Users.Preview).toBeCallableWith({
    title: 'Preview',
    count: 1,
  });
  expectTypeOf(Users.Empty).toBeCallableWith({
    message: 'Empty',
  });
  () => {
    // @ts-expect-error required props belong to the custom state
    Users.Preview({});
    Users.Empty({
      // @ts-expect-error another state's props cannot be passed here
      count: 1,
    });
    // @ts-expect-error undeclared states are not exposed
    Users.Loading;
  };
});

it('preserves the function overload and its props and context', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
  });
  const definition = defineBoundLayout({
    props: {
      include: {
        title: true,
      },
      custom: {
        count: z.number(),
      },
    },
    render: ({ title, count }, { resources }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(count).toEqualTypeOf<number>();
      expectTypeOf(resources.current).toEqualTypeOf<'users'>();

      return (
        <p>
          {title}: {count}
        </p>
      );
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
  });
  expectTypeOf(Users).toBeCallableWith({
    count: 1,
  });
});

it('validates option names in custom inline states', () => {
  const { defineResourceLayout: defineBoundLayout } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
  });
  () => {
    const invalidOptions3 = {
      render: {
        default: () => <></>,
        Preview: {
          props: {
            include: {
              missing: true,
            },
          },
          render: () => <></>,
        },
      },
    } as const;

    // @ts-expect-error unknown options cannot be included in a custom state
    defineBoundLayout(invalidOptions3);
  };
});

it('tracks custom inline states through resource-bound and shell overloads', () => {
  const resourceDefinition = defineResourceLayout.forResources('users')({
    resources: ['posts'],
    options: {
      title: z.string(),
    },
    layout: {
      render: {
        default: () => <></>,
        Preview: {
          props: {
            include: {
              title: true,
            },
            custom: {
              count: z.number(),
            },
          },
          render: ({ title, count }, { resources }) => {
            expectTypeOf(title).toEqualTypeOf<string>();
            expectTypeOf(count).toEqualTypeOf<number>();
            expectTypeOf(resources.current).toEqualTypeOf<'users' | 'posts'>();

            return (
              <p>
                {title}: {count}
              </p>
            );
          },
        },
      },
    },
  });
  const ResourceUsers = resourceDefinition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
  });
  expectTypeOf(ResourceUsers.Preview).toBeCallableWith({
    count: 1,
  });

  const shellDefinition = defineResourceLayout.withLayout({
    resources: ['users'],
    options: {
      title: z.string(),
    },
    shell: {
      render: (_props, { children }) => <main>{children}</main>,
    },
    layout: {
      render: {
        default: () => <></>,
        Preview: {
          props: {
            include: {
              title: true,
            },
            custom: {
              count: z.number(),
            },
          },
          render: ({ title, count }) => {
            expectTypeOf(title).toEqualTypeOf<string>();
            expectTypeOf(count).toEqualTypeOf<number>();

            return (
              <p>
                {title}: {count}
              </p>
            );
          },
        },
      },
    },
  });
  const ShellUsers = shellDefinition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
  });
  expectTypeOf(ShellUsers.Preview).toBeCallableWith({
    count: 1,
  });
});

it('infers inline custom states on the unbound object overload', () => {
  const definition = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: {
        default: () => <></>,
        Preview: {
          props: {
            custom: {
              count: z.number(),
            },
          },
          render: ({ count }) => {
            expectTypeOf(count).toEqualTypeOf<number>();

            return <p>{count}</p>;
          },
        },
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  expectTypeOf(Users.Preview).toBeCallableWith({
    count: 1,
  });
});
