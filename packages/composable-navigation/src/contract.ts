import {
  createPropValidator,
  defineComposableComponent,
  type PropValidatorErrorHelper,
} from '@jfdevelops/react-layout-composables';

/** One navigation item: its label, or its label with a destination and state. */
export type NavigationItem =
  | string
  | {
      value: string;
      href?: string;
      isActive?: boolean;
      isDisabled?: boolean;
    };

/** Navigation items keyed by a stable id. */
export type NavigationItems = Record<string, NavigationItem>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptional(value: unknown, type: 'boolean' | 'string') {
  return value === undefined || typeof value === type;
}

function isNavigationItem(item: unknown) {
  if (typeof item === 'string') {
    return true;
  }

  return (
    isRecord(item) &&
    typeof item.value === 'string' &&
    isOptional(item.href, 'string') &&
    isOptional(item.isActive, 'boolean') &&
    isOptional(item.isDisabled, 'boolean')
  );
}

function assertNavigationItems(
  value: unknown,
  error: PropValidatorErrorHelper,
): asserts value is NavigationItems {
  if (!isRecord(value)) {
    throw error('Expected navigation items keyed by id');
  }

  const invalidKey = Object.keys(value).find(
    (key) => !isNavigationItem(value[key]),
  );

  if (invalidKey !== undefined) {
    throw error(`"${invalidKey}" is not a label or a navigation item`);
  }
}

const items = createPropValidator(({ value, error }) => {
  assertNavigationItems(value, error);

  return value;
});

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
