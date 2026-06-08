import { createProp, defineComposableComponent } from '../src';
import type { ComposablePresetComponentCallProps } from '../src';

const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumb',
  props: {
    segments: createProp.record({
      value: createProp.string(),
    }),
  },
});

const Breadcrumb = createBreadcrumbComposable(() => null);

const presetBreadcrumb = Breadcrumb.Breadcrumb;

type BreadcrumbCallProps = ComposablePresetComponentCallProps<
  typeof createBreadcrumbComposable.props
>;

type AssertSegmentsProp = 'segments' extends keyof BreadcrumbCallProps
  ? true
  : never;
const _segmentsProp: AssertSegmentsProp = true;

// @ts-expect-error children is not a preset prop
presetBreadcrumb({ segments: { home: 'Home' }, children: null });

// @ts-expect-error segments is required
presetBreadcrumb({});

void _segmentsProp;
