import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createDefinedResourceLayout, type ReusableResourcesAccessor } from '../../src';
import { z } from 'zod';

const factory = createDefinedResourceLayout({
  resources: [
    'users',
    {
      value: 'posts',
      subResources: ['comments'],
    },
  ],
  options: {
    title: z.string(),
    nested: z.object({
      label: z.string(),
      count: z.number(),
    }),
    optional: z
      .object({
        label: z.string(),
      })
      .optional(),
    subtitle: z.string().optional(),
  },
});

describe('reusable selectors', () => {
  it('supplies resource transformations and selects internal data in one callback argument', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => {
            expectTypeOf(resources.raw()[0]).toEqualTypeOf<'users'>();
            expectTypeOf(resources()[1].subResources[0].value).toEqualTypeOf<'comments'>();

            return resources.pick('posts')()[0].value;
          },
        },
        custom: {
          title: z.string(),
        },
      },
      select: {
        options: {
          nested: (nested) => ({
            label: nested.label.toUpperCase(),
          }),
        },
      },
      fn: (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<'posts'>();
        expectTypeOf(props.nested.label).toEqualTypeOf<string>();
        expect(Object.hasOwn(props, 'options')).toBe(false);

        return props;
      },
    });
    const input = {
      title: 'Heading',
      options: {
        nested: {
          label: 'docs',
          count: 1,
        },
      },
    };
    expect(helper(input)).toEqual({
      title: 'Heading',
      resources: 'posts',
      nested: {
        label: 'DOCS',
      },
    });
    expect(input.options.nested.label).toBe('docs');
  });

  it('accepts and validates one caller-supplied resource with single()', () => {
    const fn = vi.fn();
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => resources.single(),
        },
      },
      select: {
        options: {
          title: (title) => title.toUpperCase(),
        },
      },
      fn: (props) => {
        fn(props);

        return `${props.resources}: ${props.title}`;
      },
    });
    expect(
      helper({
        resources: 'posts',
        options: {
          title: 'Docs',
        },
      }),
    ).toBe('posts: DOCS');
    fn.mockClear();
    for (const resources of ['missing', ['users'], 1, undefined]) {
      expect(() =>
        helper({
          resources,
          options: {
            title: 'Docs',
          },
        } as never),
      ).toThrow();
    }
    expect(fn).not.toHaveBeenCalled();
    expect(() =>
      helper({
        options: {
          title: 'Docs',
        },
      } as never),
    ).toThrow();
  });

  it('validates a single-resource include even when preferSelect discards its output', () => {
    const fn = vi.fn();
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => resources.single(),
        },
      },
      select: {
        resources: (resources) => resources.raw(),
      },
      overlap: 'preferSelect',
      fn: (props) => {
        fn(props);

        return props.resources;
      },
    });
    for (const props of [
      {},
      {
        resources: 'missing',
      },
      {
        resources: ['users'],
      },
    ]) {
      expect(() => helper(props as never)).toThrow();
    }
    expect(fn).not.toHaveBeenCalled();
    expect(
      helper({
        resources: 'posts.comments',
      }),
    ).toEqual(factory.resources.raw());
  });

  it('validates a discarded selected single-resource contract under preferProps', () => {
    const fn = vi.fn();
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => resources.raw(),
        },
      },
      select: {
        resources: (resources) => resources.single(),
      },
      overlap: 'preferProps',
      fn: (props) => {
        fn(props);

        return props.resources;
      },
    });
    expect(() => helper({} as never)).toThrow();
    expect(() =>
      helper({
        resources: 'missing',
      } as never),
    ).toThrow();
    expect(fn).not.toHaveBeenCalled();
    expect(
      helper({
        resources: 'posts.comments',
      }),
    ).toEqual(factory.resources.raw());
  });

  it('evaluates each resource callback once per call while validating overlap contracts', () => {
    const single = vi.fn((resources: ReusableResourcesAccessor<readonly ['users']>) =>
      resources.single(),
    );
    const derived = vi.fn((resources: ReusableResourcesAccessor<readonly ['users']>) =>
      resources.raw(),
    );
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
    });
    const helper = createReusable({
      props: {
        include: {
          resources: single,
        },
      },
      select: {
        resources: derived,
      },
      overlap: 'preferSelect',
      fn: (props) => props.resources,
    });
    expect(single).not.toHaveBeenCalled();
    expect(derived).not.toHaveBeenCalled();
    expect(
      helper({
        resources: 'users',
      }),
    ).toEqual(['users']);
    expect(
      helper({
        resources: 'users',
      }),
    ).toEqual(['users']);
    expect(single).toHaveBeenCalledTimes(2);
    expect(derived).toHaveBeenCalledTimes(2);
    single.mockClear();
    const shared = createReusable({
      props: {
        include: {
          resources: single,
        },
      },
      select: {
        resources: single,
      },
      fn: (props) => props.resources,
    });
    expect(
      shared({
        resources: 'users',
      }),
    ).toBe('users');
    expect(single).toHaveBeenCalledOnce();
  });

  it('infers the resource union and preserves array and derived resource behavior', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => resources.single(),
        },
      },
      fn: (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<'users' | 'posts' | 'posts.comments'>();

        return props.resources;
      },
    });
    expectTypeOf(helper)
      .parameter(0)
      .toEqualTypeOf<{ resources: 'users' | 'posts' | 'posts.comments' }>();
    expect(
      helper({
        resources: 'users',
      }),
    ).toBe('users');
    expect(
      helper({
        resources: 'posts.comments',
      }),
    ).toBe('posts.comments');
    const array = factory.createReusable({
      props: {
        include: {
          resources: true,
        },
      },
      fn: (props) => props.resources,
    });
    expect(
      array({
        resources: ['users', 'posts'],
      }),
    ).toEqual(['users', 'posts']);
    const derived = factory.createReusable({
      select: {
        resources: (resources) => resources.raw()[0],
      },
      fn: (props) => props.resources,
    });
    expect(derived()).toBe('users');
    const selected = factory.createReusable({
      select: {
        resources: (resources) => resources.single(),
      },
      fn: (props) => props.resources,
    });
    expect(
      selected({
        resources: 'posts',
      }),
    ).toBe('posts');
  });

  it('accepts complete nested paths and rejects unqualified or invalid subresources', () => {
    const { createReusable } = createDefinedResourceLayout({
      resources: [
        'users',
        {
          value: 'posts',
          subResources: [
            {
              value: 'comments',
              subResources: ['replies'],
            },
          ],
        },
      ],
    });
    const helper = createReusable({
      props: {
        include: {
          resources: (resources) => resources.single(),
        },
      },
      fn: (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<
          'users' | 'posts' | 'posts.comments' | 'posts.comments.replies'
        >();

        return props.resources;
      },
    });
    expect(
      helper({
        resources: 'posts.comments.replies',
      }),
    ).toBe('posts.comments.replies');
    for (const resources of ['comments', 'replies', 'posts.replies', 'posts.comments.missing']) {
      expect(() =>
        helper({
          resources,
        } as never),
      ).toThrow();
    }
  });

  it('requires only explicitly selected option values', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: {
            title: (title) => title.toUpperCase(),
          },
        },
      },
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();

        return props.title;
      },
    });
    expect(
      helper({
        options: {
          title: 'Docs',
        },
      }),
    ).toBe('DOCS');
    expect(() => helper({} as never)).toThrow();
    expect(() =>
      helper({
        options: {
          title: 1,
        },
      } as never),
    ).toThrow();
  });

  it('deduplicates identical callbacks and true selections', () => {
    const transform = vi.fn((title: string) => title.toUpperCase());
    const helper = factory.createReusable({
      props: {
        include: {
          options: {
            title: transform,
          },
        },
      },
      select: {
        options: {
          title: transform,
        },
      },
      fn: (props) => props.title,
    });
    expect(
      helper({
        options: {
          title: 'docs',
        },
      }),
    ).toBe('DOCS');
    expect(transform).toHaveBeenCalledOnce();
  });

  it('deduplicates the same resource selector', () => {
    const selector = vi.fn((resources: typeof factory.resources) => resources.raw()[0]);
    const helper = factory.createReusable({
      props: {
        include: {
          resources: selector,
        },
      },
      select: {
        resources: selector,
      },
      fn: (props) => props.resources,
    });
    expect(helper()).toBe('users');
    expect(selector).toHaveBeenCalledOnce();
  });

  it('rejects ambiguous overlaps even when return types match', () => {
    expect(() =>
      factory.createReusable({
        props: {
          include: {
            options: {
              title: (title) => title.toUpperCase(),
            },
          },
        },
        select: {
          options: {
            title: (title) => title.toLowerCase(),
          },
        },
        fn: (props) => props.title,
      }),
    ).toThrow(/Ambiguous reusable property "title"/);
    expect(() =>
      factory.createReusable({
        props: {
          custom: {
            title: z.string(),
          },
        },
        select: {
          options: {
            title: true,
          },
        },
        fn: (props) => props.title,
      }),
    ).toThrow(/overlap/);
    expect(() =>
      factory.createReusable({
        props: {
          include: {
            resources: true,
          },
        },
        select: {
          resources: true,
        },
        fn: () => null,
      }),
    ).toThrow(/Ambiguous/);
  });

  it('supports explicit overlap precedence with the matching inferred type', () => {
    const preferredProps = factory.createReusable({
      props: {
        custom: {
          title: z.number(),
        },
      },
      select: {
        options: {
          title: true,
        },
      },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<number>();

        return props.title;
      },
    });
    const preferredSelect = factory.createReusable({
      props: {
        custom: {
          title: z.number(),
        },
      },
      select: {
        options: {
          title: true,
        },
      },
      overlap: 'preferSelect',
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();

        return props.title;
      },
    });
    expect(
      preferredProps({
        title: 1,
        options: {
          title: 'Docs',
        },
      }),
    ).toBe(1);
    expect(
      preferredSelect({
        title: 1,
        options: {
          title: 'Docs',
        },
      }),
    ).toBe('Docs');
  });

  it('validates source values before callbacks execute', () => {
    const select = vi.fn((title: string) => title.toUpperCase());
    const helper = factory.createReusable({
      select: {
        options: {
          title: select,
        },
      },
      fn: (props) => props.title,
    });
    for (const options of [
      null,
      [],
      {
        title: 1,
      },
      {},
    ]) {
      expect(() =>
        helper({
          options,
        } as never),
      ).toThrow();
    }
    expect(select).not.toHaveBeenCalled();
    helper({
      options: {
        title: 'Docs',
      },
    });
    expect(select).toHaveBeenCalledOnce();
  });

  it('keeps optional sources and optional nested results optional', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: {
            subtitle: (value) => value?.toUpperCase() ?? 'DEFAULT',
          },
        },
      },
      select: {
        options: {
          optional: true,
        },
      },
      fn: (props) => {
        expectTypeOf(props.optional).toEqualTypeOf<{ label: string } | undefined>();

        return props;
      },
    });
    expect(helper()).toEqual({
      subtitle: 'DEFAULT',
    });
    expect(
      helper({
        options: {
          subtitle: 'docs',
          optional: {
            label: 'Label',
          },
        },
      }),
    ).toEqual({
      subtitle: 'DOCS',
      optional: {
        label: 'Label',
      },
    });
  });

  it('applies precedence to an entire transformed object and skips the losing transform', () => {
    const transform = vi.fn((nested: { label: string; count: number }) => ({
      summary: nested.label,
    }));
    const preferredProps = factory.createReusable({
      props: {
        include: {
          options: {
            nested: transform,
          },
        },
      },
      select: {
        options: {
          nested: (nested) => ({
            count: nested.count,
          }),
        },
      },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.nested).toEqualTypeOf<{ summary: string }>();

        return props.nested;
      },
    });
    expect(
      preferredProps({
        options: {
          nested: {
            label: 'Docs',
            count: 2,
          },
        },
      }),
    ).toEqual({
      summary: 'Docs',
    });
    transform.mockClear();
    const selectCount = (nested: { label: string; count: number }) => ({
      count: nested.count,
    });
    const preferredSelect = factory.createReusable({
      props: {
        include: {
          options: {
            nested: transform,
          },
        },
      },
      select: {
        options: {
          nested: selectCount,
        },
      },
      overlap: 'preferSelect',
      fn: (props) => {
        expectTypeOf(props.nested).toEqualTypeOf<{ count: number }>();

        return props.nested;
      },
    });
    expect(
      preferredSelect({
        options: {
          nested: {
            label: 'Docs',
            count: 2,
          },
        },
      }),
    ).toEqual({
      count: 2,
    });
    expect(transform).not.toHaveBeenCalled();
  });

  it('preserves the optionality of the chosen overlap result', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: {
            optional: true,
          },
        },
      },
      select: {
        options: {
          optional: (value) => value?.label ?? 'Default',
        },
      },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.optional).toEqualTypeOf<{ label: string } | undefined>();

        return props;
      },
    });
    expect(helper()).toEqual({});
  });

  it('passes async results through without adding required resource inputs', async () => {
    const helper = factory.createReusable({
      select: {
        resources: async (resources) => resources.raw()[0],
      },
      fn: async (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<Promise<'users'>>();

        return await props.resources;
      },
    });
    await expect(helper()).resolves.toBe('users');
  });

  it('exposes complete resolved sources when explicitly requested', () => {
    const helper = factory.createReusable({
      select: {
        resources: true,
        options: true,
      },
      fn: (props) => props.resources.isResource('users') && props.title === 'Docs',
    });
    expect(
      helper({
        options: {
          title: 'Docs',
          nested: {
            label: 'Label',
            count: 1,
          },
        },
      }),
    ).toBe(true);
    const whole = factory.createReusable({
      props: {
        include: {
          options: (values) => values.title.toUpperCase(),
        },
      },
      fn: (props) => props.options,
    });
    expect(
      whole({
        options: {
          title: 'Docs',
          nested: {
            label: 'Label',
            count: 1,
          },
        },
      }),
    ).toBe('DOCS');
  });

  it('rejects invalid selections and reserved input collisions', () => {
    for (const select of [
      {
        missing: true,
      },
      {
        resources: false,
      },
      {
        options: {
          missing: () => 1,
        },
      },
    ]) {
      expect(() =>
        factory.createReusable({
          select,
          fn: () => null,
        } as never),
      ).toThrow();
    }
    expect(() =>
      factory.createReusable({
        props: {
          custom: {
            options: z.string(),
          },
        },
        select: {
          options: {
            title: true,
          },
        },
        fn: () => null,
      }),
    ).toThrow(/reserved/);
  });
});
