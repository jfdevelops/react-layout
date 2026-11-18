import { defineResourceLayout } from '@jfdevelops/react-layout';

const definition = defineResourceLayout({
  resources: ['users'],
  namespace: true,
  layout: {
    render: {
      default: () => <p>Users</p>,
      Loading: () => <p>Loading users</p>,
    },
  },
});

const Users = definition.createResourceLayout({
  resource: 'users',
  name: 'Users',
});

export const Callable = definition.createResourceLayout({
  resource: 'users',
  name: 'Callable',
  namespace: false,
});

export function Screen() {
  return (
    <>
      <Users.Root />
      <Users.Loading />
      <Callable />
    </>
  );
}
