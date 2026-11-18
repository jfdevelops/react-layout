import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceConfig } = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins'],
    },
    'groups',
  ],
  layout: {
    render: () => <main />,
  },
});

const config = createResourceConfig({
  users: {
    component: <p>Users</p>,
    errorComponent: <p>Users failed</p>,
    detail: {
      component: <p>User detail</p>,
    },
    admins: {
      component: <p>Admins</p>,
    },
  },
  groups: {
    component: <p>Groups</p>,
  },
});

export const usersPage = config.getComponent({
  resource: 'users',
});

export const adminsPage = config.getComponent({
  resource: 'users',
  subResource: 'admins',
});

export const getDetail = config.createGetComponent(
  '$resource.detail.$component',
);

export const detail = getDetail({
  resource: 'users',
  component: 'component',
});
