import {
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';

/**
 * Text for a copy composable's props. Use `copyText.optional()` for a prop a
 * page may leave out.
 */
export const copyText = createPropValidator(({ value, error }) => {
  if (typeof value !== 'string') {
    throw error('Expected text');
  }

  return value;
});

/**
 * The page copy contract: a title and an optional description. Composables
 * extended from it share both props, so a page supplies each value once.
 */
export const createCopyComposable = defineComposableComponent({
  name: 'Copy',
  props: {
    title: copyText,
    description: copyText.optional(),
  },
});
