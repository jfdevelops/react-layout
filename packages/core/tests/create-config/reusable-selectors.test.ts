import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createDefinedResourceLayout, createProp } from '../../src';

const factory = createDefinedResourceLayout({
  resources: ['users', { value: 'posts', subResources: ['comments'] }],
  options: {
    title: createProp.string(),
    nested: createProp.object({
      label: createProp.string(),
      count: createProp.number(),
    }),
    optional: createProp.object({ label: createProp.string() }).optional(),
    subtitle: createProp.string().optional(),
  },
});

describe('reusable selectors', () => {
  it('supplies resource transformations and selects internal data in one callback argument', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          resources: (resources) => {
            expectTypeOf(resources.raw()[0]).toEqualTypeOf<'users'>();
            expectTypeOf(
              resources()[1].subResources[0].value,
            ).toEqualTypeOf<'comments'>();
            return resources.pick('posts')()[0].value;
          },
        },
        custom: { title: createProp.string() },
      },
      select: {
        options: { nested: { label: (label) => label.toUpperCase() } },
      },
      fn: (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<'posts'>();
        expectTypeOf(props.nested.label).toEqualTypeOf<string>();
        expect(Object.hasOwn(props, 'options')).toBe(false);
        return props;
      },
    });
    const input = { title: 'Heading', options: { nested: { label: 'docs' } } };
    expect(helper(input)).toEqual({
      title: 'Heading',
      resources: 'posts',
      nested: { label: 'DOCS' },
    });
    expect(input.options.nested.label).toBe('docs');
  });

  it('requires only explicitly selected option values', () => {
    const helper = factory.createReusable({
      props: {
        include: { options: { title: (title) => title.toUpperCase() } },
      },
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();
        return props.title;
      },
    });
    expect(helper({ options: { title: 'Docs' } })).toBe('DOCS');
    expect(() => helper({} as never)).toThrow();
    expect(() => helper({ options: { title: 1 } } as never)).toThrow();
  });

  it('combines disjoint nested fields from include and select', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: {
            nested: {
              label: (label) => label.toUpperCase(),
            },
          },
        },
      },
      select: {
        options: {
          nested: {
            count: (count) => count * 2,
          },
        },
      },
      fn: (props) => props.nested,
    });
    expect(
      helper({ options: { nested: { label: 'docs', count: 2 } } }),
    ).toEqual({ label: 'DOCS', count: 4 });
  });

  it('deduplicates identical callbacks and true selections', () => {
    const transform = vi.fn((title: string) => title.toUpperCase());
    const helper = factory.createReusable({
      props: { include: { options: { title: transform } } },
      select: { options: { title: transform } },
      fn: (props) => props.title,
    });
    expect(helper({ options: { title: 'docs' } })).toBe('DOCS');
    expect(transform).toHaveBeenCalledOnce();
    const shared = factory.createReusable({
      props: { include: { options: { nested: true } } },
      select: { options: { nested: { label: true } } },
      fn: (props) => props.nested,
    });
    expect(
      shared({ nested: { count: 2 }, options: { nested: { label: 'docs' } } }),
    ).toEqual({ label: 'docs', count: 2 });
  });

  it('deduplicates the same resource selector', () => {
    const selector = vi.fn(
      (resources: typeof factory.resources) => resources.raw()[0],
    );
    const helper = factory.createReusable({
      props: { include: { resources: selector } },
      select: { resources: selector },
      fn: (props) => props.resources,
    });
    expect(helper()).toBe('users');
    expect(selector).toHaveBeenCalledOnce();
  });

  it('rejects ambiguous overlaps even when return types match', () => {
    expect(() =>
      factory.createReusable({
        props: {
          include: { options: { title: (title) => title.toUpperCase() } },
        },
        select: { options: { title: (title) => title.toLowerCase() } },
        fn: (props) => props.title,
      }),
    ).toThrow(/Ambiguous reusable property "title"/);
    expect(() =>
      factory.createReusable({
        props: { custom: { title: createProp.string() } },
        select: { options: { title: true } },
        fn: (props) => props.title,
      }),
    ).toThrow(/overlap/);
    expect(() =>
      factory.createReusable({
        props: { include: { resources: true } },
        select: { resources: true },
        fn: () => null,
      }),
    ).toThrow(/Ambiguous/);
  });

  it('supports explicit overlap precedence with the matching inferred type', () => {
    const preferredProps = factory.createReusable({
      props: { custom: { title: createProp.number() } },
      select: { options: { title: true } },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<number>();
        return props.title;
      },
    });
    const preferredSelect = factory.createReusable({
      props: { custom: { title: createProp.number() } },
      select: { options: { title: true } },
      overlap: 'preferSelect',
      fn: (props) => {
        expectTypeOf(props.title).toEqualTypeOf<string>();
        return props.title;
      },
    });
    expect(preferredProps({ title: 1, options: { title: 'Docs' } })).toBe(1);
    expect(preferredSelect({ title: 1, options: { title: 'Docs' } })).toBe(
      'Docs',
    );
  });

  it('validates source values before callbacks execute', () => {
    const select = vi.fn((title: string) => title.toUpperCase());
    const helper = factory.createReusable({
      select: { options: { title: select } },
      fn: (props) => props.title,
    });
    for (const options of [null, [], { title: 1 }, {}])
      expect(() => helper({ options } as never)).toThrow();
    expect(select).not.toHaveBeenCalled();
    helper({ options: { title: 'Docs' } });
    expect(select).toHaveBeenCalledOnce();
  });

  it('keeps optional sources and optional nested results optional', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: { subtitle: (value) => value?.toUpperCase() ?? 'DEFAULT' },
        },
      },
      select: { options: { optional: { label: true } } },
      fn: (props) => {
        expectTypeOf(props.optional).toEqualTypeOf<
          { label: string } | undefined
        >();
        return props;
      },
    });
    expect(helper()).toEqual({ subtitle: 'DEFAULT' });
    expect(
      helper({ options: { subtitle: 'docs', optional: { label: 'Label' } } }),
    ).toEqual({ subtitle: 'DOCS', optional: { label: 'Label' } });
  });

  it('resolves optional included object callbacks from source values', () => {
    const helper = factory.createReusable({
      props: {
        include: {
          options: { optional: { label: (label) => label.toUpperCase() } },
        },
      },
      fn: (props) => props.optional?.label,
    });
    expect(helper()).toBeUndefined();
    expect(helper({ options: { optional: { label: 'docs' } } })).toBe('DOCS');
  });

  it('applies precedence to an entire transformed object and skips the losing transform', () => {
    const transform = vi.fn((nested: { label: string; count: number }) => ({
      summary: nested.label,
    }));
    const preferredProps = factory.createReusable({
      props: { include: { options: { nested: transform } } },
      select: { options: { nested: { count: true } } },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.nested).toEqualTypeOf<{ summary: string }>();
        return props.nested;
      },
    });
    expect(
      preferredProps({ options: { nested: { label: 'Docs', count: 2 } } }),
    ).toEqual({ summary: 'Docs' });
    transform.mockClear();
    const preferredSelect = factory.createReusable({
      props: { include: { options: { nested: transform } } },
      select: { options: { nested: { count: true } } },
      overlap: 'preferSelect',
      fn: (props) => {
        expectTypeOf(props.nested).toEqualTypeOf<{ count: number }>();
        return props.nested;
      },
    });
    expect(
      preferredSelect({ options: { nested: { label: 'Docs', count: 2 } } }),
    ).toEqual({ count: 2 });
    expect(transform).not.toHaveBeenCalled();
  });

  it('preserves the optionality of the chosen overlap result', () => {
    const helper = factory.createReusable({
      props: { include: { options: { optional: true } } },
      select: { options: { optional: (value) => value?.label ?? 'Default' } },
      overlap: 'preferProps',
      fn: (props) => {
        expectTypeOf(props.optional).toEqualTypeOf<
          { readonly label: string } | undefined
        >();
        return props;
      },
    });
    expect(helper()).toEqual({});
  });

  it('guards each optional source independently when merging object fields', () => {
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
      options: {
        optional: createProp
          .object({ label: createProp.string(), count: createProp.number() })
          .optional(),
      },
    });
    const count = vi.fn((value: number) => value.toFixed(0));
    const helper = createReusable({
      props: { include: { options: { optional: { label: true } } } },
      select: { options: { optional: { count } } },
      fn: (props) => {
        expectTypeOf(props.optional?.label).toEqualTypeOf<string | undefined>();
        expectTypeOf(props.optional?.count).toEqualTypeOf<string | undefined>();
        return props;
      },
    });
    expect(helper({ optional: { label: 'Docs' } })).toEqual({
      optional: { label: 'Docs' },
    });
    expect(count).not.toHaveBeenCalled();
    expect(helper({ options: { optional: { count: 2 } } })).toEqual({
      optional: { count: '2' },
    });
    expect(
      helper({
        optional: { label: 'Docs' },
        options: { optional: { count: 2 } },
      }),
    ).toEqual({ optional: { label: 'Docs', count: '2' } });
    expect(helper()).toEqual({});
    expect(count).toHaveBeenCalledTimes(2);
  });

  it('guards sources split within include and retains precise same-source fields', () => {
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
      options: {
        optional: createProp
          .object({ label: createProp.string(), count: createProp.number() })
          .optional(),
      },
    });
    const helper = createReusable({
      props: {
        include: {
          options: {
            optional: { label: true, count: (count) => count.toFixed(0) },
          },
        },
      },
      fn: (props) => {
        expectTypeOf(props.optional?.label).toEqualTypeOf<string | undefined>();
        expectTypeOf(props.optional?.count).toEqualTypeOf<string | undefined>();
        return props;
      },
    });
    expect(helper({ optional: { label: 'Docs' } })).toEqual({
      optional: { label: 'Docs' },
    });
    expect(helper({ options: { optional: { count: 2 } } })).toEqual({
      optional: { count: '2' },
    });
    const sameSource = createReusable({
      props: {
        include: {
          options: { optional: { label: (label) => label.toUpperCase() } },
        },
      },
      select: { options: { optional: { count: (count) => count.toFixed(0) } } },
      fn: (props) => {
        if (props.optional) {
          expectTypeOf(props.optional.label).toEqualTypeOf<string>();
          expectTypeOf(props.optional.count).toEqualTypeOf<string>();
        }
        return props;
      },
    });
    expect(
      sameSource({ options: { optional: { label: 'Docs', count: 2 } } }),
    ).toEqual({ optional: { label: 'DOCS', count: '2' } });
  });

  it('preserves optional ancestor guards on required nested objects', () => {
    const { createReusable } = createDefinedResourceLayout({
      resources: ['users'],
      options: {
        optional: createProp
          .object({
            shared: createProp.object({
              label: createProp.string(),
              count: createProp.number(),
            }),
            caller: createProp.object({ title: createProp.string() }),
            selected: createProp.object({ count: createProp.number() }),
          })
          .optional(),
      },
    });
    const helper = createReusable({
      props: {
        include: {
          options: { optional: { shared: { label: true }, caller: true } },
        },
      },
      select: {
        options: {
          optional: {
            shared: { count: (count) => count.toFixed(0) },
            selected: { count: true },
          },
        },
      },
      fn: (props) => {
        expectTypeOf(props.optional?.shared?.label).toEqualTypeOf<
          string | undefined
        >();
        expectTypeOf(props.optional?.shared?.count).toEqualTypeOf<
          string | undefined
        >();
        if (props.optional?.caller)
          expectTypeOf(props.optional.caller.title).toEqualTypeOf<string>();
        if (props.optional?.selected)
          expectTypeOf(props.optional.selected.count).toEqualTypeOf<number>();
        return props;
      },
    });
    expect(
      helper({
        optional: { shared: { label: 'Docs' }, caller: { title: 'Title' } },
      }),
    ).toEqual({
      optional: { shared: { label: 'Docs' }, caller: { title: 'Title' } },
    });
    expect(
      helper({
        options: { optional: { shared: { count: 2 }, selected: { count: 3 } } },
      }),
    ).toEqual({ optional: { shared: { count: '2' }, selected: { count: 3 } } });
    expect(helper()).toEqual({});
  });

  it('passes async results through without adding required resource inputs', async () => {
    const helper = factory.createReusable({
      select: { resources: async (resources) => resources.raw()[0] },
      fn: async (props) => {
        expectTypeOf(props.resources).toEqualTypeOf<Promise<'users'>>();
        return await props.resources;
      },
    });
    await expect(helper()).resolves.toBe('users');
  });

  it('exposes complete resolved sources when explicitly requested', () => {
    const helper = factory.createReusable({
      select: { resources: true, options: true },
      fn: (props) =>
        props.resources.isResource('users') && props.title === 'Docs',
    });
    expect(
      helper({
        options: { title: 'Docs', nested: { label: 'Label', count: 1 } },
      }),
    ).toBe(true);
    const whole = factory.createReusable({
      props: { include: { options: (values) => values.title.toUpperCase() } },
      fn: (props) => props.options,
    });
    expect(
      whole({
        options: { title: 'Docs', nested: { label: 'Label', count: 1 } },
      }),
    ).toBe('DOCS');
  });

  it('rejects invalid selections and reserved input collisions', () => {
    for (const select of [
      { missing: true },
      { resources: false },
      { options: { missing: () => 1 } },
    ]) {
      expect(() =>
        factory.createReusable({ select, fn: () => null } as never),
      ).toThrow();
    }
    expect(() =>
      factory.createReusable({
        props: { custom: { options: createProp.string() } },
        select: { options: { title: true } },
        fn: () => null,
      }),
    ).toThrow(/reserved/);
  });
});
