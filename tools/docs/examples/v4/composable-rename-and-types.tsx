import { reactNode } from '@jfdevelops/react-layout-adapter-zod';
import { createHeaderComposable } from '@jfdevelops/react-layout-composable-copy';
import { createNavigationComposable } from '@jfdevelops/react-layout-composable-navigation/contract';

export const createStepsComposable = createNavigationComposable.extend({
  name: 'Steps',
  rename: {
    items: 'steps',
  },
});

export const header = createHeaderComposable({
  rename: {
    title: {
      name: 'heading',
      schema: reactNode(),
    },
  },
  render: ({ heading }) => <h1>{heading}</h1>,
});

const itemsSchema = createNavigationComposable.getSchema('items');
const hrefSchema = createNavigationComposable.getSchema('items.[string].href');

export type NavigationItems = typeof itemsSchema.infer;
export type Href = typeof hrefSchema.infer;
