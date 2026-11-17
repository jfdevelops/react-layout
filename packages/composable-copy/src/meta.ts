import { copyText, createCopyComposable } from './contract';

/** Document metadata: the shared title and description, and optional head tags. */
export const createMetaComposable = createCopyComposable.extend({
  name: 'Meta',
  props: {
    canonical: copyText.optional(),
    image: copyText.optional(),
    isIndexable: ({ value, error }) => {
      if (value !== undefined && typeof value !== 'boolean') {
        throw error('Expected true or false');
      }

      return value;
    },
  },
});
