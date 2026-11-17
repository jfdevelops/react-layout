import { createNavigationComposable } from './contract';

/** Navigation items for sibling views of the current page, supplied as `tabs`. */
export const createTabsComposable = createNavigationComposable.extend({
  name: 'Tabs',
  rename: {
    items: 'tabs',
  },
});
