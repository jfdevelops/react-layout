import type { PropValidatorSchema } from '@jfdevelops/react-layout-composables';
import type { NavigationItems } from '@jfdevelops/react-layout-composable-navigation';

export { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-navigation';
export type {
  NavigationItem as BreadcrumbSegment,
  NavigationItems as BreadcrumbSegments,
} from '@jfdevelops/react-layout-composable-navigation';

/** The definition of the default `segments` prop. */
export type BreadcrumbSegmentsSchema = PropValidatorSchema<NavigationItems>;
