import {
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout';

const text = createPropValidator(({ value, error }) => {
  if (typeof value !== 'string') {
    throw error('Expected text');
  }

  return value;
});

export const createNoticeComposable = defineComposableComponent({
  name: 'Notice',
  props: {
    title: text,
    description: text.optional(),
    isDismissible: ({ value }) => value === true,
  },
});
