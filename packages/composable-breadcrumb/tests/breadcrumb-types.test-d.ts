import { expectTypeOf } from 'vitest';
import { createBreadcrumbComposable } from '../src';
import { z } from 'zod';

const { Breadcrumb } = createBreadcrumbComposable({
  props: {
    segments: z.array(z.string()),
    separator: z.string().optional(),
  },
  render: ({ segments, separator }) => {
    expectTypeOf(segments).toEqualTypeOf<string[]>();
    expectTypeOf(separator).toEqualTypeOf<string | undefined>();

    return segments.join(separator);
  },
});

Breadcrumb({
  segments: ['Home'],
  separator: undefined,
});
Breadcrumb({
  segments: {
    // @ts-expect-error The replacement segments definition requires an array.
    home: 'Home',
  },
});
// @ts-expect-error Segments remain required after replacing their definition.
Breadcrumb({});
