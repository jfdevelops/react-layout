import {
  builtIn,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';

/**
 * The navigation contract. Call it for a list named `items`, or `extend` it
 * to give the list its own component and prop name.
 */
export const createNavigationComposable = defineComposableComponent({
  name: 'Navigation',
  props: {
    items: builtIn.record(
      builtIn.union(
        builtIn.string,
        builtIn.object({
          value: builtIn.string,
          href: builtIn.string.optional(),
          isActive: builtIn.boolean.optional(),
          isDisabled: builtIn.boolean.optional(),
        }),
      ),
    ),
  },
});

/** Navigation items keyed by a stable id. */
export type NavigationItems =
  typeof createNavigationComposable.Navigation.props.items;

/** One navigation item: its label, or its label with a destination and state. */
export type NavigationItem = NavigationItems[string];
