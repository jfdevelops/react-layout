import { expect, expectTypeOf, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import {
  createDefinedResourceLayout,
  createPropsFromComponent,
  defineResourceLayout,
} from '../../src';

it('provides optional children with other custom props and retains their schema for reuse', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: {
        custom: {
          title: z.string(),
        },
      },
      render: ({ children, title }) => {
        expectTypeOf(children).toEqualTypeOf<ReactNode>();

        return (
          <main>
            {title}
            {children}
          </main>
        );
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const definitions = createPropsFromComponent(Users).pick('children');

  expect(definitions.children['~standard'].validate(undefined)).toEqual({
    value: undefined,
  });
  expect(
    renderToStaticMarkup(
      <Users title='Users'>
        <strong>Content</strong>
      </Users>,
    ),
  ).toContain('<strong>Content</strong>');
  expect(renderToStaticMarkup(<Users title='Empty' />)).toContain('Empty');
  expect(() =>
    renderToStaticMarkup(
      <Users title='Invalid'>
        {
          {
            invalid: true,
          } as never
        }
      </Users>,
    ),
  ).toThrow(/Invalid prop "children/);
});

it('lets an explicit schema replace ReactNode, including its input, output, and requirement', () => {
  const children = z
    .object({
      label: z.string(),
    })
    .transform(({ label }) => ({
      upper: label.toUpperCase(),
    }));
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: {
        custom: {
          children,
        },
      },
      render: ({ children }) => {
        expectTypeOf(children).toEqualTypeOf<{ upper: string }>();

        return <p>{children.upper}</p>;
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expect(createPropsFromComponent(Users).pick('children').children).toBe(
    children,
  );
  expect(
    renderToStaticMarkup(
      <Users>
        {{
          label: 'custom',
        }}
      </Users>,
    ),
  ).toContain('CUSTOM');
});

it('provides children to states and shells without a custom declaration', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
  });
  const Loading = factory.createRenderState({
    state: 'Loading',
    render: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();

      return <p>{children ?? 'Loading'}</p>;
    },
  });
  const states = factory.defineResourceLayout({
    render: {
      default: () => <></>,
      ...Loading,
    },
  });
  const Users = states.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const { Shell } = defineResourceLayout.withLayout({
    resources: ['users'],
    shell: {
      render: ({ children }) => <aside>{children}</aside>,
    },
  });

  expect(
    renderToStaticMarkup(<Users.Loading>State content</Users.Loading>),
  ).toContain('State content');
  expect(renderToStaticMarkup(<Users.Loading />)).toContain('Loading');
  expect(
    renderToStaticMarkup(
      <Shell>
        <span>Shell content</span>
      </Shell>,
    ),
  ).toContain('Shell content');
});

it('does not replace explicit scoped children when another resource adds unrelated props', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: ({ children }) => <main>{children}</main>,
    },
  });
  const Directory = createResourceLayout.forResources('users').createComponent({
    props: {
      custom: {
        children: z.string().transform((value) => value.toUpperCase()),
      },
    },
    resources: {
      users: {
        props: {
          custom: {
            title: z.string().optional(),
          },
        },
        render: () => <></>,
      },
    },
    render: ({ children }) => <p>{children}</p>,
  });

  expect(
    renderToStaticMarkup(
      <Directory resource='users'>Scoped content</Directory>,
    ),
  ).toContain('SCOPED CONTENT');
});

it('provides children to reusable helpers and honors custom schemas', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
  });
  const read = factory.createReusable({
    fn: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();

      return children;
    },
  });
  const custom = factory.createReusable({
    props: {
      custom: {
        children: z.object({
          label: z.string(),
        }),
      },
    },
    fn: ({ children }) => children.label,
  });

  expect(read()).toBeUndefined();
  expect(
    read({
      children: 'Reusable content',
    }),
  ).toBe('Reusable content');
  expect(
    custom({
      children: {
        label: 'Custom content',
      },
    }),
  ).toBe('Custom content');
});

it('allows shells and scoped components to replace the default children type', () => {
  const children = z.object({
    label: z.string(),
  });
  const { Shell, createResourceLayout } = defineResourceLayout.withLayout({
    resources: ['users'],
    shell: {
      props: {
        custom: {
          children,
        },
      },
      render: ({ children }) => <aside>{children.label}</aside>,
    },
  });
  const Directory = createResourceLayout.forResources('users').createComponent({
    props: {
      custom: {
        children,
      },
    },
    render: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<{ label: string }>();

      return <p>{children.label}</p>;
    },
  });

  expect(
    renderToStaticMarkup(
      <Shell>
        {{
          label: 'Shell override',
        }}
      </Shell>,
    ),
  ).toContain('Shell override');
  expect(
    renderToStaticMarkup(
      <Directory resource='users'>
        {{
          label: 'Scoped override',
        }}
      </Directory>,
    ),
  ).toContain('Scoped override');
});

it('lets a nested scoped component override inherited default children', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      render: ({ children }) => <main>{children}</main>,
    },
  });
  const Directory = createResourceLayout.forResources('users').createComponent({
    resources: {
      users: {
        components: {
          Details: {
            props: {
              children: z.object({
                label: z.string(),
              }),
            },
            render: ({ children }) => {
              expectTypeOf(children).toEqualTypeOf<{ label: string }>();

              return <p>{children.label}</p>;
            },
          },
        },
        render: (_, { Details }) => (
          <Details>
            {{
              label: 'Nested override',
            }}
          </Details>
        ),
      },
    },
    render: (_, { Users }) => <Users />,
  });

  expect(renderToStaticMarkup(<Directory resource='users' />)).toContain(
    'Nested override',
  );
});

it('keeps implicit children out of strict whole-object option schemas', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: z
      .object({
        count: z.number(),
      })
      .strict(),
  });
  const read = factory.createReusable({
    props: {
      include: {
        options: true,
      },
    },
    fn: ({ children, count }) => ({
      children,
      count,
    }),
  });

  expect(
    read({
      count: 2,
      children: 'Content',
    }),
  ).toEqual({
    count: 2,
    children: 'Content',
  });
});

it.each([false, true])(
  'preserves opaque whole-object children inputs (default: %s)',
  (withDefault) => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      options: z
        .object({
          children: withDefault ? z.string().default('Fallback') : z.string(),
        })
        .transform(({ children }) => ({
          children: children.toUpperCase(),
        })),
    });
    const read = factory.createReusable({
      props: {
        include: {
          options: true,
        },
      },
      fn: ({ children }) => children,
    });

    expect(
      read({
        children: 'Content',
      }),
    ).toBe('CONTENT');
  },
);

it('preserves explicitly selected children option schemas', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      children: z.object({
        label: z.string(),
      }),
    },
  });
  const read = factory.createReusable({
    props: {
      include: {
        options: {
          children: true,
        },
      },
    },
    fn: ({ children }) => children.label,
  });

  expect(
    read({
      children: {
        label: 'Option content',
      },
    }),
  ).toBe('Option content');
});
