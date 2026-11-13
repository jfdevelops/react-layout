import { defineComposableComponent } from '../src';
import type { ComposablePresetComponentCallProps } from '../src';
import { z } from 'zod';

const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumb',
  props: {
    segments: z.record(z.string(), z.string()),
  },
});

const Breadcrumb = createBreadcrumbComposable(() => null);

const presetBreadcrumb = Breadcrumb.Breadcrumb;

type BreadcrumbCallProps = ComposablePresetComponentCallProps<
  typeof createBreadcrumbComposable.props
>;

type AssertSegmentsProp = 'segments' extends keyof BreadcrumbCallProps ? true : never;
const _segmentsProp: AssertSegmentsProp = true;

// Every composable accepts the built-in optional children slot.
presetBreadcrumb({
  segments: {
    home: 'Home',
  },
  children: null,
});

// @ts-expect-error segments is required
presetBreadcrumb({});

void _segmentsProp;
