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

const renamedProp = createLabel({
  rename: {
    value: 'heading',
    suffix: {
      name: 'count',
      schema: z.number(),
    },
  },
  render: ({ heading, count }) => {
    expectTypeOf(heading).toEqualTypeOf<string>();
    expectTypeOf(count).toEqualTypeOf<number>();

    return heading + count;
  },
});
<renamedProp.Label heading='Heading' count={1} label='Frame' />;
// @ts-expect-error The original prop name was replaced.
<renamedProp.Label value='Heading' count={1} label='Frame' />;
// @ts-expect-error The replacement definition determines the value type.
<renamedProp.Label heading='Heading' count='one' label='Frame' />;
createLabel.extend({
  rename: {
    // @ts-expect-error Only declared props can be renamed.
    missing: 'other',
  },
});

const createTitle = createLabel.extend({
  name: 'Title',
  rename: {
    value: 'title',
  },
  props: {
    level: z.number(),
  },
});
expectTypeOf(createTitle.props.title).toEqualTypeOf(createLabel.props.value);
const { Title } = createTitle(({ title, suffix, level }) => {
  expectTypeOf(title).toEqualTypeOf<string>();
  expectTypeOf(suffix).toEqualTypeOf<string>();
  expectTypeOf(level).toEqualTypeOf<number>();

  return title;
});
<Title title='Title' suffix='!' level={1} label='Frame' />;
// @ts-expect-error The derived factory keeps the renamed prop required.
<Title suffix='!' level={1} label='Frame' />;

// A factory's name holds its definitions and their value types; extending
// renames it.
expectTypeOf(createLabel.Label.props).toEqualTypeOf(createLabel.props);
expectTypeOf<typeof createLabel.Label.infer>().toEqualTypeOf<{
  value: string;
  suffix: string;
}>();
expectTypeOf<typeof createTitle.Title.infer.level>().toEqualTypeOf<number>();
// @ts-expect-error The derived factory is read under its own name.
createTitle.Label;

// Colliding names keep the factory API, without intersecting a named alias.
const createProps = createLabel.extend({
  name: 'props',
});
expectTypeOf(createProps.props.value).toEqualTypeOf(createLabel.props.value);
// @ts-expect-error `props` is the prop dictionary, not a named definition alias.
createProps.props.infer;
const createExtend = createLabel.extend({
  name: 'extend',
});
const { extend: Extend } = createExtend(({ value, suffix }) => value + suffix);
<Extend value='Label' suffix='!' label='Frame' />;
createExtend.extend({
  name: 'Other',
});
