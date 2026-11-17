import {
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';

const names = createPropValidator(({ value, error }) => {
  if (
    !Array.isArray(value) ||
    !value.every((name) => typeof name === 'string')
  ) {
    throw error('Expected a list of names');
  }

  return value;
}).optional();

/**
 * The access contract: what a page requires before its content is shown. The
 * render callback decides how each requirement is checked.
 */
export const createAccessComposable = defineComposableComponent({
  name: 'Access',
  props: {
    roles: names,
    permissions: names,
    flag: ({ value, error }) => {
      if (value !== undefined && typeof value !== 'string') {
        throw error('Expected a flag name');
      }

      return value;
    },
  },
});
