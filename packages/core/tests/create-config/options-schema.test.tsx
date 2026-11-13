import { expect, expectTypeOf, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import {
  defineResourceLayout,
  createDefinedResourceLayout,
  defineComposableComponent,
  type InPropsOptions,
} from '../../src';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';

it('accepts an aliased whole object schema and preserves object refinements and transforms', () => {
  const optionsSchema = z
    .strictObject({
      title: z.string(),
      description: reactNode(),
      icon: reactElement().optional(),
      count: z.string().transform(Number),
      label: z.string().default('Items'),
    })
    .refine(({ count }) => count > 0, {
      message: 'Count must be positive',
    });
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    options: optionsSchema,
    layout: {
      props: {
        include: {
          title: true,
          description: true,
          icon: 'optional',
          count: true,
          label: true,
        },
      },
      render: ({ title, description, icon, count, label }) => {
        expectTypeOf(title).toEqualTypeOf<string>();
        expectTypeOf(count).toEqualTypeOf<number>();
        expectTypeOf(label).toEqualTypeOf<string>();

        return (
          <main>
            {icon}
            {title}
            {description}
            {label}:{count + 1}
          </main>
        );
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
    description: <span>List</span>,
    count: '2',
  });
  expect(renderToStaticMarkup(<Users />)).toContain('Items:3</main>');
  const Invalid = createResourceLayout({
    resource: 'users',
    name: 'Invalid',
    title: 'Users',
    description: null,
    count: '-1',
  });
  expect(() => renderToStaticMarkup(<Invalid />)).toThrow('Count must be positive');
});

it('combines bound options with component-supplied inputs before validating the whole object', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: z.object({
      prefix: z.string(),
      count: z.string().transform(Number),
    }),
  });
  const { createResourceLayout } = factory.defineResourceLayout({
    props: {
      include: {
        prefix: true,
        count: {
          required: true,
          suppliedVia: 'component',
        },
      },
    },
    render: ({ prefix, count }) => (
      <p>
        {prefix}:{count + 1}
      </p>
    ),
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    prefix: 'Items',
  });
  expect(renderToStaticMarkup(<Users count='2' />)).toContain('>Items:3</p>');
});

it('accepts whole Valibot and callable ArkType schemas', () => {
  for (const options of [
    v.object({
      title: v.string(),
    }),
    type({
      title: 'string',
    }),
  ]) {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options,
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: ({ title }) => <p>{title}</p>,
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      title: 'Users',
    });
    expect(renderToStaticMarkup(<Users />)).toContain('>Users</p>');
  }
});

it('preserves whole-object output transforms without inspecting vendor-specific schema internals', () => {
  const schema = z
    .object({
      first: z.string(),
      last: z.string(),
    })
    .transform(({ first, last }) => ({
      title: `${first} ${last}`,
    }));
  const opaqueSchema = {
    '~standard': {
      ...schema['~standard'],
      vendor: 'opaque-test',
    },
  };
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    options: opaqueSchema,
    layout: {
      props: {
        include: {
          title: true,
        },
      },
      render: ({ title }) => {
        expectTypeOf(title).toEqualTypeOf<string>();

        return <p>{title}</p>;
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    first: 'Joey',
    last: 'F',
  });
  expect(renderToStaticMarkup(<Users />)).toContain('>Joey F</p>');
});

it('validates full schemas in reusable functions with caller and source inputs', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: z
      .object({
        prefix: z.string(),
        count: z.string().transform(Number),
      })
      .refine(({ count }) => count > 0, 'Positive count required'),
  });
  const read = factory.createReusable({
    props: {
      include: {
        options: true,
      },
    },
    fn: ({ prefix, count }) => {
      expectTypeOf(count).toEqualTypeOf<number>();

      return `${prefix}:${count + 1}`;
    },
  });
  expect(
    read({
      prefix: 'Items',
      count: '2',
    }),
  ).toBe('Items:3');
  expect(() =>
    read({
      prefix: 'Items',
      count: '-1',
    }),
  ).toThrow('Positive count required');
  const select = factory.createReusable({
    select: {
      options: {
        count: (count) => count + 1,
      },
    },
    fn: ({ count }) => count,
  });
  expect(
    select({
      options: {
        prefix: 'Items',
        count: '2',
      },
    }),
  ).toBe(3);
  const split = factory.createReusable({
    props: {
      include: {
        options: {
          count: true,
        },
      },
    },
    fn: ({ count }) => count + 1,
  });
  expect(
    split({
      count: '2',
      options: {
        prefix: 'Items',
      },
    }),
  ).toBe(3);
});

it('validates whole schema options on scoped components and forwards original inputs to Root', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    options: z.object({
      count: z.string().transform(Number),
    }),
    layout: {
      props: {
        include: {
          count: true,
        },
      },
      render: ({ count }) => <p>{count + 1}</p>,
    },
  });
  const Directory = createResourceLayout.forResources('users').createComponent({
    props: {
      include: {
        count: true,
      },
    },
    resources: {
      users: {
        render: () => <aside>Content</aside>,
      },
    },
    render: ({ count }, { Root }) => (
      <main>
        {count + 1}
        <Root />
      </main>
    ),
  });
  expect(renderToStaticMarkup(<Directory resource='users' count='2' />)).toContain('>3<p');
});

it('validates whole object schemas on persistent shells', () => {
  const { Shell } = defineResourceLayout.withLayout({
    resources: ['users'],
    options: z.object({
      count: z.string().transform(Number),
    }),
    shell: {
      props: {
        include: {
          count: {
            required: true,
            suppliedVia: 'component',
          },
        },
      },
      render: ({ count }, { children }) => (
        <main>
          {count + 1}
          {children}
        </main>
      ),
    },
    layout: {
      render: () => <p>Page</p>,
    },
  });
  expect(
    renderToStaticMarkup(
      <Shell count='2'>
        <aside>Content</aside>
      </Shell>,
    ),
  ).toContain('>3<aside>Content</aside></main>');
});

it('keeps whole-object outputs separate from preset schema inputs in layouts', () => {
  const count = z.string().transform(Number);
  const preset = defineComposableComponent({
    name: 'Count',
    props: {
      count,
    },
  });
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    options: z.object({
      count,
    }),
    layout: {
      composables: () => preset(({ count }) => <span>{count + 1}</span>),
      props: {
        include: {
          count: true,
        },
      },
      render: ({ count }, { composables }) => (
        <main>
          {count + 1}
          <composables.Count count='4' />
        </main>
      ),
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    count: '2',
  });
  const markup = renderToStaticMarkup(<Users />);

  expect(markup).toContain('>3<span');
  expect(markup).toContain('>5</span>');
});

it('validates preset defaults from raw inputs rather than whole-object shell outputs', () => {
  const count = z.string().default('2').transform(Number);
  const preset = defineComposableComponent({
    name: 'Count',
    props: {
      count,
    },
  });
  const { Shell } = defineResourceLayout.withLayout({
    resources: ['users'],
    options: z.object({
      count,
    }),
    shell: {
      composables: () => preset(({ count }) => <span>{count + 1}</span>),
      props: {
        include: {
          count: {
            required: true,
            suppliedVia: 'component',
          },
        },
      },
      render: ({ count }, { composables }) => (
        <main>
          {count + 1}
          <composables.Count />
        </main>
      ),
    },
    layout: {
      render: () => <p>Page</p>,
    },
  });
  const markup = renderToStaticMarkup(<Shell />);

  expect(markup).toContain('>3<span');
  expect(markup).toContain('>3</span>');
});

it('supplies resolved shell defaults to required legacy and schema presets without defaults', () => {
  const preset = defineComposableComponent({
    name: 'Summary',
    props: {
      count: z.number(),
      label: z.string(),
      optional: z.string().optional(),
    },
  });
  const { Shell } = defineResourceLayout.withLayout({
    resources: ['users'],
    options: z.object({
      count: z.number().default(2),
      label: z.string().default('Items'),
      optional: z.string().default('Available'),
    }),
    shell: {
      composables: () =>
        preset(({ count, label, optional }) => (
          <span>
            {count + 1}:{label}:{optional}
          </span>
        )),
      props: {
        include: {
          count: true,
          label: true,
          optional: true,
        },
      },
      render: ({ count }, { composables }) => (
        <main>
          {count + 1}
          {createElement(composables.Summary, {} as never)}
        </main>
      ),
    },
    layout: {
      render: () => <p>Page</p>,
    },
  });
  const markup = renderToStaticMarkup(<Shell />);

  expect(markup).toContain('>3<span');
  expect(markup).toContain('>3:Items:Available</span>');
});

it('supplies transformed shell defaults to schema presets accepting the resolved output', () => {
  const preset = defineComposableComponent({
    name: 'Count',
    props: {
      count: z.number(),
    },
  });
  const { Shell } = defineResourceLayout.withLayout({
    resources: ['users'],
    options: z.object({
      count: z.string().default('2').transform(Number),
    }),
    shell: {
      composables: () => preset(({ count }) => <span>{count + 1}</span>),
      props: {
        include: {
          count: true,
        },
      },
      render: ({ count }, { composables }) => (
        <main>
          {count + 1}
          {createElement(composables.Count, {} as never)}
        </main>
      ),
    },
    layout: {
      render: () => <p>Page</p>,
    },
  });
  const markup = renderToStaticMarkup(<Shell />);

  expect(markup).toContain('>3<span');
  expect(markup).toContain('>3</span>');
});

it('builds options from the bound resources and component name', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users', 'posts'],
    options: ({ resource, name }: InPropsOptions<readonly ['users', 'posts'], string>) => ({
      target: resource,
      label: name,
    }),
    layout: {
      props: {
        include: {
          target: true,
          label: true,
        },
      },
      render: ({ target, label }) => {
        expectTypeOf(target).toEqualTypeOf<'users' | 'posts'>();
        expectTypeOf(label).toBeString();

        return (
          <p>
            {label}:{target}
          </p>
        );
      },
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'UsersPage',
    target: 'posts',
  });

  // The name definition supplies its own value; nothing is passed for `label`.
  expect(renderToStaticMarkup(<Users />)).toContain('UsersPage:posts');
  expect(() =>
    createResourceLayout({
      resource: 'users',
      name: 'Invalid',
      target: 'missing' as never,
    }),
  ).not.toThrow();
  expect(() =>
    renderToStaticMarkup(
      createElement(
        createResourceLayout({
          resource: 'users',
          name: 'Invalid',
          target: 'missing' as never,
        }),
      ),
    ),
  ).toThrow(/target/);
});
