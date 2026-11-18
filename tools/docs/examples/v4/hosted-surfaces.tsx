import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const admin = createDefinedResourceLayout({
  resources: ['users', 'teams'],
});
const panes = admin.defineResourceSurface({
  resources: ['create', 'detail'],
  host: {
    resources: ['users'],
  },
});
const paneLayout = panes.defineResourceLayout({
  render: () => <aside />,
});

export const UserCreatePane = paneLayout.createResourceLayout.forResource({
  resource: 'create',
  hostedBy: 'users',
})();
