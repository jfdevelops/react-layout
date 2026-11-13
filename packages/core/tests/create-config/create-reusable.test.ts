import { describe, expect, it } from 'vitest';
import { createDefinedResourceLayout, type InPropsOptions } from '../../src';
import { z } from 'zod';

const { createReusable } = createDefinedResourceLayout({
  resources: ['panedeck', 'jfdevelops'],
  options: {
    title: z.string(),
    presentation: z.enum(['docs', 'article']),
    meta: z
      .object({
        source: z.literal('github'),
        owner: z.string(),
        repo: z.string(),
      })
      .or(
        z.object({
          source: z.literal('npm'),
          package: z.string(),
        }),
      ),
    nested: z.object({
      label: z.string(),
      hidden: z.number(),
    }),
    subtitle: z.string().optional(),
  },
});

describe('createReusable', () => {
  it('creates the requested URL helper and retains discriminated unions', () => {
    const createUrl = createReusable({
      props: {
        include: {
          options: {
            meta: true,
          },
        },
      },
      fn: ({ meta }) =>
        meta.source === 'github'
          ? `https://github.com/${meta.owner}/${meta.repo}`
          : `https://npmjs.com/package/${meta.package}`,
    });
    expect(
      createUrl({
        meta: {
          source: 'github',
          owner: 'jfdevelops',
          repo: 'react-layout',
        },
      }),
    ).toBe('https://github.com/jfdevelops/react-layout');
    expect(
      createUrl({
        meta: {
          source: 'npm',
          package: 'react-layout',
        },
      }),
    ).toBe('https://npmjs.com/package/react-layout');
    expect(() =>
      createUrl({
        meta: {
          source: 'other',
        },
      } as never),
    ).toThrow();
  });

  it('combines resource selections, nested selections, and custom props', () => {
    const format = createReusable({
      props: {
        include: {
          resources: true,
          options: {
            nested: {
              label: true,
            },
          },
        },
        custom: {
          suffix: z.string(),
        },
      },
      fn: ({ resources, nested, suffix }) =>
        `${resources.join(',')}: ${nested.label}${suffix}`,
    });
    expect(
      format({
        resources: ['panedeck'],
        nested: {
          label: 'Docs',
        },
        suffix: '!',
      }),
    ).toBe('panedeck: Docs!');
    expect(() =>
      format({
        resources: ['other'],
        nested: {
          label: 'Docs',
        },
        suffix: '!',
      } as never),
    ).toThrow();
    expect(() =>
      format({
        resources: [],
        nested: {
          label: 'Docs',
        },
      } as never),
    ).toThrow();
  });

  it('supports optional inputs, no inputs, and async results', async () => {
    expect(
      createReusable({
        fn: () => 42,
      })(),
    ).toBe(42);
    const optional = createReusable({
      props: {
        include: {
          options: {
            subtitle: true,
          },
        },
      },
      fn: async ({ subtitle }) => subtitle ?? 'Default',
    });
    await expect(optional()).resolves.toBe('Default');
  });

  it('selects all options and validates custom definitions before calling fn', () => {
    const all = createReusable({
      props: {
        include: {
          options: true,
        },
      },
      fn: ({ title }) => title,
    });
    expect(
      all({
        title: 'Docs',
        presentation: 'docs',
        meta: {
          source: 'npm',
          package: 'pkg',
        },
        nested: {
          label: 'Docs',
          hidden: 1,
        },
      }),
    ).toBe('Docs');
    const custom = createReusable({
      props: {
        custom: {
          count: z.number(),
        },
      },
      fn: ({ count }) => count + 1,
    });
    expect(
      custom({
        count: 1,
      }),
    ).toBe(2);
    expect(() =>
      custom({
        count: 'one',
      } as never),
    ).toThrow();
  });

  it('supports callback option definitions', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users', 'posts'],
      options: ({
        resource,
      }: Pick<
        InPropsOptions<readonly ['users', 'posts'], never>,
        'resource'
      >) => ({
        target: resource,
      }),
    });
    const target = factory.createReusable({
      props: {
        include: {
          options: {
            target: true,
          },
        },
      },
      fn: ({ target }) => target,
    });
    expect(
      target({
        target: 'users',
      }),
    ).toBe('users');
    expect(() =>
      target({
        target: 'other',
      } as never),
    ).toThrow();
  });

  it('rejects unknown selections and prop collisions for untyped callers', () => {
    expect(() =>
      createReusable({
        props: {
          include: {
            missing: true,
          },
        },
        fn: () => null,
      } as never),
    ).toThrow();
    expect(() =>
      createReusable({
        props: {
          include: {
            options: {
              missing: true,
            },
          },
        },
        fn: () => null,
      } as never),
    ).toThrow();
    expect(() =>
      createReusable({
        props: {
          include: {
            options: {
              title: true,
            },
          },
          custom: {
            title: z.number(),
          },
        },
        fn: () => null,
      }),
    ).toThrow();
  });
});
