import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const factory = createDefinedResourceLayout({
  resources: ['users'],
});

export const layout = factory.defineResourceLayout({
  composables: (_create, states) => ({
    Message: states.Message.asComposable({
      props: {
        include: {
          message: true,
        },
      },
    }),
    ExplicitMessage: states.Message,
  }),
  render: {
    default: {
      props: {
        custom: {
          message: z.string(),
        },
      },
      render: (_props, { composables }) => (
        <>
          <composables.Message />
          <composables.ExplicitMessage message='Explicit value' />
        </>
      ),
    },
    Message: {
      props: {
        custom: {
          message: z.string(),
        },
      },
      render: ({ message }) => <p>{message}</p>,
    },
  },
});
