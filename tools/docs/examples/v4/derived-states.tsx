import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createRenderState } = createDefinedResourceLayout({
  resources: ['users'],
});

const Message = createRenderState({
  state: 'Message',
  props: {
    custom: {
      message: z.string(),
    },
  },
  render: ({ message }) => <p>{message}</p>,
});

export const Notice = createRenderState.fromState({
  ref: Message,
  state: 'Notice',
  props: {
    custom: {
      heading: z.string(),
    },
  },
  render: ({ heading }, { composables, resources }) => (
    <section>
      <h2>
        {heading} — {resources.current}
      </h2>
      <composables.Ref />
    </section>
  ),
});
