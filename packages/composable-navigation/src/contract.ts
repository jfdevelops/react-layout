import {
  builtIn,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';

const navigationItem = builtIn.union(
  builtIn.string,
  builtIn.object({
    value: builtIn.string,
    href: builtIn.string.optional(),
    isActive: builtIn.boolean.optional(),
    isDisabled: builtIn.boolean.optional(),
  }),
);

const items = builtIn.record(navigationItem);

/** One navigation item: its label, or its label with a destination and state. */
export type NavigationItem = StandardSchemaV1.InferOutput<
  typeof navigationItem
>;

/** Navigation items keyed by a stable id. */
export type NavigationItems = StandardSchemaV1.InferOutput<typeof items>;

/**
 * The navigation contract. Call it for a list named `items`, or `extend` it
 * to give the list its own component and prop name.
 */
export const createNavigationComposable = defineComposableComponent({
  name: 'Navigation',
  props: {
    items,
  },
});
