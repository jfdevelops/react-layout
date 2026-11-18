import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: {
    title: z.string(),
  },
  layout: {
    render: {
      default: {
        props: {
          include: {
            title: true,
          },
        },
        render: ({ title }) => <h1>{title}</h1>,
      },
      Loading: () => <p>Loading users…</p>,
      Error: {
        props: {
          custom: {
            error: z.object({
              message: z.string(),
            }),
          },
        },
        render: ({ error }) => <p>{error.message}</p>,
      },
      NotFound: () => <p>Users not found.</p>,
    },
  },
});

const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
});

export function UsersScreen() {
  return (
    <>
      <Users />
      <Users.Loading />
      <Users.NotFound />
    </>
  );
}
