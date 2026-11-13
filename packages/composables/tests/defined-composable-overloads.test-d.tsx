import { expectTypeOf } from 'vitest';
import type { ReactNode } from 'react';
import { defineComposableComponent } from '../src';
import { z } from 'zod';

function Frame({ children, label }: { children?: ReactNode; label: string }) {
  return <section aria-label={label}>{children}</section>;
}

const createLabel = defineComposableComponent({
  name: 'Label',
  props: {
    value: z.string(),
    suffix: z.string(),
  },
  wrapWith: Frame,
});

const legacy = createLabel(({ value }) => {
  expectTypeOf(value).toEqualTypeOf<string>();

  return value;
});
const unchanged = createLabel({
  render: ({ value }) => {
    expectTypeOf(value).toEqualTypeOf<string>();

    return value;
  },
});
<legacy.Label value='Legacy' suffix='!' label='Frame' />;
<unchanged.Label value='Object' suffix='!' label='Frame' />;

const renamed = createLabel({
  name: 'Count',
  props: {
    value: z.number(),
    tags: z.array(z.string()),
  },
  render: ({ value, suffix, tags }) => {
    expectTypeOf(value).toEqualTypeOf<number>();
    expectTypeOf(suffix).toEqualTypeOf<string>();
    expectTypeOf(tags).toEqualTypeOf<string[]>();

    return `${value}${suffix}${tags.join(',')}`;
  },
});
<renamed.Count value={1} suffix='!' tags={[]} label='Frame' />;
// @ts-expect-error The original name was replaced.
renamed.Label;
// @ts-expect-error Replaced definitions determine component call types.
<renamed.Count value='wrong' suffix='!' tags={[]} label='Frame' />;
// @ts-expect-error The default wrapper still requires label.
<renamed.Count value={1} suffix='!' tags={[]} />;

const callback = createLabel({
  props: (defaults) => ({
    suffix: defaults.suffix.optional(),
  }),
  wrapWith: ({ children, count }: { children?: ReactNode; count: number }) => (
    <div>
      {count}
      {children}
    </div>
  ),
  render: ({ value, suffix }) => {
    expectTypeOf(value).toEqualTypeOf<string>();
    expectTypeOf(suffix).toEqualTypeOf<string | undefined>();

    return value + suffix;
  },
});
<callback.Label value='Value' suffix={undefined} count={1} />;
// @ts-expect-error The replacement wrapper requires count.
<callback.Label value='Value' suffix={undefined} label='Old wrapper' />;

const empty = defineComposableComponent({
  name: 'Empty',
});
const { Empty } = empty({
  props: {
    count: z.number(),
  },
  render: ({ count }) => count,
});
<Empty count={1} />;
// @ts-expect-error Added props are required.
<Empty />;
