import {
  createProp,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';
import type { IncludedProps, MergedLayoutInProps } from '../../src';

const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumbs',
  props: {
    segments: createProp.record({
      value: createProp.string(),
    }),
  },
});

const Breadcrumbs = createBreadcrumbComposable(() => null);

const { createResourceLayout } = defineResourceLayout({
  resources: ['contacts'],
  options: {
    title: createProp.string(),
  },
  layout: {
    composables: () => ({
      ...Breadcrumbs,
    }),
    props: {
      include: {
        title: true,
        segments: true,
      },
    },
    render: (props) => {
      const _title: string = props.title;
      const _segments: Record<string, string> = props.segments;

      return null!;
    },
  },
});

// @ts-expect-error preset props must be provided at layout creation time
createResourceLayout({
  resource: 'contacts',
  name: 'ContactsPage',
  title: 'Directory',
});

type MergedProps = MergedLayoutInProps<
  ['contacts'],
  { title: ReturnType<typeof createProp.string> },
  typeof Breadcrumbs
>;

type AssertSegmentsKey = 'segments' extends keyof MergedProps ? true : never;
const _segmentsKey: AssertSegmentsKey = true;

type IncludeOptions = IncludedProps<MergedProps>;
const _validInclude: IncludeOptions = {
  title: true,
  segments: true,
};

type RejectUnknownIncludeKey = 'unknown' extends keyof IncludeOptions
  ? never
  : true;
const _rejectUnknown: RejectUnknownIncludeKey = true;

void _segmentsKey;
void _validInclude;
void _rejectUnknown;
