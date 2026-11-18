import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createRenderState, defineResourceLayout } = createDefinedResourceLayout(
  {
    resources: ['users'],
    options: {
      title: z.string(),
    },
    composables: (create) => ({
      Layout: create({
        name: 'PageLayout',
      }),
    }),
  },
);

export const Loading = createRenderState({
  state: 'Loading',
  props: {
    include: {
      title: true,
    },
  },
  render: ({ title }) => <p>Loading {title}…</p>,
});

export const usersLayout = defineResourceLayout({
  render: {
    default: () => <p>Users</p>,
    ...Loading,
  },
});
