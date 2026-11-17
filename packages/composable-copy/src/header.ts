import { copyText, createCopyComposable } from './contract';

/** Visible page copy: the shared title and description, and an optional eyebrow. */
export const createHeaderComposable = createCopyComposable.extend({
  name: 'Header',
  props: {
    eyebrow: copyText.optional(),
  },
});
