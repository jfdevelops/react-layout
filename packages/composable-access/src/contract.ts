import {
  builtIn,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';

const names = builtIn.array(builtIn.string).optional();

/**
 * The access contract: what a page requires before its content is shown. The
 * render callback decides how each requirement is checked.
 */
export const createAccessComposable = defineComposableComponent({
  name: 'Access',
  props: {
    roles: names,
    permissions: names,
    flag: builtIn.string.optional(),
  },
});
