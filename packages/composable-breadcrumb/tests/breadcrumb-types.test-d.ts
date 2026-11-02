import { expectTypeOf } from 'vitest';
import { createProp } from '@jfdevelops/react-layout-composables';
import { createBreadcrumbComposable } from '../src';

const { Breadcrumb } = createBreadcrumbComposable({
  props: {
    segments: createProp.array(createProp.string()),
    separator: createProp.string().optional(),
  },
  render: ({ segments, separator }) => {
    expectTypeOf(segments).toEqualTypeOf<string[]>();
    expectTypeOf(separator).toEqualTypeOf<string | undefined>();
    return segments.join(separator);
  },
});

Breadcrumb({ segments: ['Home'], separator: undefined });
// @ts-expect-error The replacement segments definition requires an array.
Breadcrumb({ segments: { home: 'Home' } });
// @ts-expect-error Segments remain required after replacing their definition.
Breadcrumb({});
