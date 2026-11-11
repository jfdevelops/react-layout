import { describe, expect, expectTypeOf, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import {
  createDefinedResourceLayout,
  createProp,
  defineResourceLayout,
  defineComposableComponent,
} from '../../src';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';
import * as valibot from '@jfdevelops/react-layout-adapter-valibot';
import * as arktype from '@jfdevelops/react-layout-adapter-arktype';

describe('Standard Schema props', () => {
  it('forwards raw map-form option inputs to Root while exposing outputs to scoped renders', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        count: z.string().transform(Number),
      },
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
    const markup = renderToStaticMarkup(<Directory resource='users' count='2' />);

    expect(markup).toContain('>3<p');
    expect(markup).toContain('>3</p>');
  });

  it('accepts schema aliases alongside legacy definitions and native React schemas', () => {
    const titleSchema = z.string();
    const options = {
      title: titleSchema,
      description: reactNode(),
      icon: reactElement().optional(),
      legacy: createProp.number(),
    };
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options,
      layout: {
        props: {
          include: {
            title: true,
            description: true,
            icon: 'optional',
            legacy: true,
          },
        },
        render: ({ title, description, icon, legacy }) => {
          expectTypeOf(title).toEqualTypeOf<string>();
          expectTypeOf(description).toEqualTypeOf<Exclude<ReactNode, undefined>>();
          expectTypeOf(icon).toEqualTypeOf<ReactElement | undefined>();

          return (
            <main>
              {icon}
              {title}
              {description}
              {legacy}
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
      legacy: 2,
    });
    expect(renderToStaticMarkup(<Users />)).toContain('<span>List</span>');
  });

  it('uses schema inputs for callers and transformed outputs for render callbacks', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        count: z.string().transform(Number),
      },
      layout: {
        props: {
          include: {
            count: true,
          },
          custom: {
            label: z.string().default('Default'),
            length: z.string().transform((value) => value.length),
          },
        },
        render: ({ count, label, length }) => {
          expectTypeOf(count).toEqualTypeOf<number>();
          expectTypeOf(label).toEqualTypeOf<string>();
          expectTypeOf(length).toEqualTypeOf<number>();

          return (
            <p>
              {label}:{count + length}
            </p>
          );
        },
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      count: '2',
    });
    expect(renderToStaticMarkup(<Users length='abc' />)).toContain('>Default:5</p>');
    // @ts-expect-error Callers supply schema input, not transformed output.
    const invalid = <Users length={3} />;
    void invalid;
  });

  it('accepts Valibot and ArkType schemas without registration', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      layout: {
        props: {
          custom: {
            title: v.string(),
            count: type('number'),
          },
        },
        render: ({ title, count }) => (
          <p>
            {title}:{count}
          </p>
        ),
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
    });
    expect(renderToStaticMarkup(<Users title='Users' count={2} />)).toContain('>Users:2</p>');
  });

  it('preserves explicit null overrides for schema-backed included props', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: {
        title: z
          .string()
          .nullable()
          .transform((value) => value ?? 'Empty'),
      },
      layout: {
        props: {
          include: {
            title: 'optional',
          },
        },
        render: ({ title }) => <p>{title}</p>,
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      title: 'Default',
    });
    expect(renderToStaticMarkup(<Users title={null} />)).toContain('>Empty</p>');
  });

  it('passes defaults and transforms into reusable functions', () => {
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
      options: {
        count: z.string().transform(Number),
      },
    });
    const read = createReusable({
      props: {
        include: {
          options: {
            count: true,
          },
        },
        custom: {
          label: z.string().default('Count'),
        },
      },
      fn: ({ count, label }) => {
        expectTypeOf(count).toEqualTypeOf<number>();
        expectTypeOf(label).toEqualTypeOf<string>();

        return `${label}:${count + 1}`;
      },
    });
    expect(
      read({
        count: '2',
      }),
    ).toBe('Count:3');
  });

  it('transforms preset composable values once and validates call-site overrides', () => {
    const preset = defineComposableComponent({
      name: 'Count',
      props: {
        count: z.string().transform(Number),
      },
    });
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      layout: {
        composables: () =>
          preset(({ count }) => {
            expectTypeOf(count).toEqualTypeOf<number>();

            return <span>{count + 1}</span>;
          }),
        render: (_, { composables }) => (
          <>
            {createElement(composables.Count, {} as never)}
            <composables.Count count='4' />
          </>
        ),
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
      count: '2',
    });
    const markup = renderToStaticMarkup(<Users />);
    expect(markup).toContain('>3</span>');
    expect(markup).toContain('>5</span>');
  });

  it('uses schema input contracts on reusable states and scoped components', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
    });
    const Preview = factory.createRenderState({
      state: 'Preview',
      props: {
        custom: {
          count: z.string().transform(Number),
        },
      },
      render: ({ count }) => {
        expectTypeOf(count).toEqualTypeOf<number>();

        return <p>{count + 1}</p>;
      },
    });
    const { createResourceLayout } = factory.defineResourceLayout({
      render: {
        default: () => <main />,
        ...Preview,
      },
    });
    const Users = createResourceLayout({
      resource: 'users',
      name: 'Users',
    });
    expect(renderToStaticMarkup(<Users.Preview count='2' />)).toContain('>3</p>');
    const Directory = createResourceLayout.forResources('users').createComponent({
      props: {
        custom: {
          count: z.string().transform(Number),
        },
      },
      render: ({ count }) => {
        expectTypeOf(count).toEqualTypeOf<number>();

        return <p>{count + 1}</p>;
      },
    });
    expect(renderToStaticMarkup(<Directory resource='users' count='2' />)).toContain('>3</p>');
  });

  it('carries original schema inputs into referenced render states', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
    });
    const Source = factory.createRenderState({
      props: {
        custom: {
          count: z.string().transform(Number),
        },
      },
      render: ({ count }) => <p>{count + 1}</p>,
    });
    const Derived = factory.createRenderState.fromState({
      ref: Source,
      render: (_props, { composables }) => <composables.Ref />,
    });
    const Users = factory
      .defineResourceLayout({
        render: {
          ...Derived,
        },
      })
      .createResourceLayout({
        resource: 'users',
        name: 'Users',
      });
    expect(renderToStaticMarkup(<Users count='2' />)).toContain('>3</p>');
  });
});

describe('native React adapters', () => {
  it('threads opaque ArkType schemas through layout and scoped component inference', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      options: { content: arktype.reactNode(), icon: arktype.reactElement() },
      layout: {
        props: { include: { content: true, icon: true } },
        render: ({ content, icon }) => {
          expectTypeOf(content).toEqualTypeOf<Exclude<ReactNode, undefined>>();
          expectTypeOf(icon).toEqualTypeOf<ReactElement>();

          return (
            <main>
              {icon}
              {content}
            </main>
          );
        },
      },
    });
    const Directory = createResourceLayout.forResources('users').createComponent({
      resources: { users: { render: () => <aside /> } },
      props: { include: { content: true, icon: true } },
      render: ({ content, icon }, { Root }) => {
        expectTypeOf(content).toEqualTypeOf<Exclude<ReactNode, undefined>>();
        expectTypeOf(icon).toEqualTypeOf<ReactElement>();

        return <Root />;
      },
    });

    expect(
      renderToStaticMarkup(<Directory resource='users' content='Users' icon={<span />} />),
    ).toContain('Users');
  });

  it('requires node keys unless explicitly wrapped as optional', () => {
    const zodSchema = z.object({ node: reactNode() });
    const valibotSchema = v.object({ node: valibot.reactNode() });
    // Runtime schemas remain native, even though their public types are opaque.
    const nativeNode = arktype.reactNode() as unknown as type.Any;
    const arktypeSchema = type({ node: nativeNode });

    for (const input of [{}, { node: undefined }]) {
      expect(zodSchema.safeParse(input).success).toBe(false);
      expect(v.safeParse(valibotSchema, input).success).toBe(false);
      expect(arktypeSchema.allows(input)).toBe(false);
    }

    expect(z.object({ node: reactNode().optional() }).safeParse({}).success).toBe(true);
    expect(v.safeParse(v.object({ node: v.optional(valibot.reactNode()) }), {}).success).toBe(true);
    expect(type({ 'node?': nativeNode }).allows({})).toBe(true);
    expectTypeOf<z.infer<typeof zodSchema>>().toEqualTypeOf<{
      node: Exclude<ReactNode, undefined>;
    }>();
    expectTypeOf<v.InferOutput<typeof valibotSchema>>().toEqualTypeOf<{
      node: Exclude<ReactNode, undefined>;
    }>();
    expectTypeOf(arktype.reactNode()).toEqualTypeOf<arktype.ReactNodeSchema>();
    expectTypeOf(arktype.reactElement()).toEqualTypeOf<arktype.ReactElementSchema>();
  });

  for (const [name, node, element, parse] of [
    [
      'zod',
      reactNode(),
      reactElement(),
      (schema: z.ZodType, value: unknown) => schema.safeParse(value).success,
    ],
    [
      'valibot',
      valibot.reactNode(),
      valibot.reactElement(),
      (schema: v.GenericSchema, value: unknown) => v.safeParse(schema, value).success,
    ],
    [
      'arktype',
      arktype.reactNode(),
      arktype.reactElement(),
      (schema: type.Any, value: unknown) => schema.allows(value),
    ],
  ] as const) {
    it(`${name} distinguishes nodes from elements`, () => {
      const accepts = parse as (schema: unknown, value: unknown) => boolean;
      for (const value of [
        'text',
        1,
        null,
        false,
        <span />,
        [<span key='a' />, 'text'],
        new Set(['text']),
      ]) {
        expect(accepts(node, value)).toBe(true);
      }
      for (const value of [
        undefined,
        {},
        () => <span />,
        {
          $$typeof: Symbol('fake'),
        },
        ['text', {}],
      ]) {
        expect(accepts(node, value)).toBe(false);
      }
      expect(accepts(element, <span />)).toBe(true);
      for (const value of [
        'text',
        null,
        [],
        () => <span />,
        {
          $$typeof: Symbol('fake'),
        },
      ]) {
        expect(accepts(element, value)).toBe(false);
      }
    });
  }
});
