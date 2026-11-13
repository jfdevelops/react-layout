import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import * as v from 'valibot';
import {
  componentSlot,
  createDefinedResourceLayout,
  createPropsFromComponent,
  defineResourceLayout,
} from '../../src';
import { optionalDefinition } from '../../src/built-in-props';
import { isComponentSlot } from '@jfdevelops/react-layout-validator';

it('preserves missing children defaults in render states', () => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
  });
  const Loading = factory.createRenderState({
    state: 'Loading',
    props: {
      custom: {
        children: z.string().default('Loading'),
      },
    },
    render: ({ children }) => <p>{children?.toUpperCase()}</p>,
  });
  const { createResourceLayout } = factory.defineResourceLayout({
    render: {
      default: () => <></>,
      ...Loading,
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expect(renderToStaticMarkup(<Users.Loading />)).toContain('>LOADING</p>');
});

it('accepts custom component slots under their capitalized names', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: {
        custom: {
          actions: componentSlot(),
        },
      },
      render: ({ Actions }) => <Actions />,
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
  });

  expect(
    renderToStaticMarkup(<Users Actions={() => <button>Run</button>} />),
  ).toBe('<button>Run</button>');
});

it('retains slot branding when optional included definitions are lifted', () => {
  const slot = componentSlot();
  expect(isComponentSlot(optionalDefinition(slot))).toBe(true);
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    options: {
      actions: slot,
    },
    layout: {
      props: {
        include: {
          actions: 'optional',
        },
      },
      render: () => <></>,
    },
  });
  const Source = createResourceLayout({
    resource: 'users',
    name: 'Source',
  });
  const lifted = createPropsFromComponent(Source).pick('actions');
  expect(isComponentSlot(lifted.actions)).toBe(true);
  const target = defineResourceLayout({
    resources: ['users'],
    layout: {
      props: {
        custom: lifted,
      },
      render: ({ Actions }) => (Actions ? <Actions /> : <p>Empty</p>),
    },
  });
  const Target = target.createResourceLayout({
    resource: 'users',
    name: 'Target',
  });

  expect(
    renderToStaticMarkup(<Target Actions={() => <button>Lifted</button>} />),
  ).toBe('<button>Lifted</button>');
  expect(renderToStaticMarkup(<Target />)).toContain('>Empty</p>');
});

it('runs whole-object refinements and strictness for whole-field selections', () => {
  const { createReusable } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      meta: z
        .object({
          count: z.number(),
        })
        .strict()
        .refine(({ count }) => count > 0),
    },
  });
  const read = createReusable({
    props: {
      include: {
        options: {
          meta: true,
        },
      },
    },
    fn: ({ meta }) => meta,
  });

  expect(() =>
    read({
      meta: {
        count: -1,
      },
    }),
  ).toThrow(/Invalid prop/);
  expect(() =>
    read({
      meta: {
        count: 1,
        extra: true,
      },
    } as never),
  ).toThrow(/Invalid prop/);
  expect(
    read({
      meta: {
        count: 2,
      },
    }),
  ).toEqual({
    count: 2,
  });
});

it('keeps whole-object transform outputs for introspectable schemas', () => {
  const { createReusable } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      meta: v.pipe(
        v.object({
          label: v.string(),
        }),
        v.transform(({ label }) => ({
          upper: label.toUpperCase(),
        })),
      ),
    },
  });
  const read = createReusable({
    select: {
      options: {
        meta: true,
      },
    },
    fn: ({ meta }) => meta,
  });

  expect(
    read({
      options: {
        meta: {
          label: 'docs',
        },
      },
    }),
  ).toEqual({
    upper: 'DOCS',
  });
});
