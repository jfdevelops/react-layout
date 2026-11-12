import { defineComposableComponent } from '@jfdevelops/react-layout-composables';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';
import { type } from 'arktype';

/** One breadcrumb segment: its label, or its label with an active flag. */
export type BreadcrumbSegment =
  | string
  | {
      value: string;
      isActive?: boolean;
    };

/** Breadcrumb segments keyed by a stable id. */
export type BreadcrumbSegments = Record<string, BreadcrumbSegment>;

/** Opaque schema type that keeps ArkType internals out of consumer generics. */
export interface BreadcrumbSegmentsSchema extends StandardSchemaV1<
  BreadcrumbSegments,
  BreadcrumbSegments
> {}

const segments = type({
  '[string]': type('string').or({
    value: 'string',
    'isActive?': 'boolean',
  }),
}) as unknown as BreadcrumbSegmentsSchema;

export const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumb',
  props: {
    segments,
  },
});
