import { createNavigationComposable } from './contract';

/** Navigation items for the path to the current page, supplied as `segments`. */
export const createBreadcrumbComposable = createNavigationComposable.extend({
  name: 'Breadcrumb',
  rename: {
    items: 'segments',
  },
});
