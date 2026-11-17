import { builtIn } from '@jfdevelops/react-layout-composables';
import { copyText, createCopyComposable } from './contract';

/** Document metadata: the shared title and description, and optional head tags. */
export const createMetaComposable = createCopyComposable.extend({
  name: 'Meta',
  props: {
    canonical: copyText.optional(),
    image: copyText.optional(),
    isIndexable: builtIn.boolean.optional(),
  },
});
