import { expectTypeOf } from 'vitest';
import { createDefinedResourceLayout, createProp } from '../../src';

const { createReusable } = createDefinedResourceLayout({
  resources: ['users', 'posts'],
  options: {
    title: createProp.string(),
    presentation: createProp.string.enum(['docs', 'article']),
    nested: createProp.object({
      label: createProp.string(),
      hidden: createProp.number(),
    }),
  },
});

const helper = createReusable({
  props: {
    include: {
      resources: true,
      options: { presentation: true, nested: { label: true } },
    },
    custom: {
      count: createProp.number(),
      suffix: createProp.string().optional(),
    },
  },
  fn: ({ resources, presentation, nested, count, suffix }) => {
    expectTypeOf(resources).toEqualTypeOf<('users' | 'posts')[]>();
    expectTypeOf(presentation).toEqualTypeOf<'docs' | 'article'>();
    expectTypeOf(nested.label).toEqualTypeOf<string>();
    expectTypeOf(count).toEqualTypeOf<number>();
    expectTypeOf(suffix).toEqualTypeOf<string | undefined>();
    // @ts-expect-error Hidden was not selected.
    nested.hidden;
    return { count };
  },
});
expectTypeOf(helper).returns.toEqualTypeOf<{ count: number }>();
helper({
  resources: ['users'],
  presentation: 'docs',
  nested: { label: 'Docs' },
  count: 1,
});
helper({
  // @ts-expect-error Invalid resource.
  resources: ['other'],
  presentation: 'docs',
  nested: { label: 'Docs' },
  count: 1,
});
// @ts-expect-error Included fields are required.
helper({ count: 1 });
// @ts-expect-error Unknown root selection.
createReusable({ props: { include: { title: true } }, fn: () => null });
createReusable({
  // @ts-expect-error Unknown option, even alongside a valid option.
  props: { include: { options: { title: true, missing: true } } },
  fn: () => null,
});
createReusable({
  // @ts-expect-error Unknown nested key.
  props: { include: { options: { nested: { missing: true } } } },
  fn: () => null,
});
createReusable({
  // @ts-expect-error Primitive definitions cannot be drilled into.
  props: { include: { options: { title: { value: true } } } },
  fn: () => null,
});
const empty = createDefinedResourceLayout({ resources: ['users'] });
// @ts-expect-error No options were defined.
empty.createReusable({ props: { include: { options: true } }, fn: () => null });
