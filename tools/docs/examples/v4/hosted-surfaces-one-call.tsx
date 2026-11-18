import { defineResourceSurfaces } from '@jfdevelops/react-layout';

export const surfaces = defineResourceSurfaces({
  page: {
    resources: ['users', 'teams'],
    render: () => <main />,
  },
  pane: {
    resources: ['create', 'detail'],
    host: {
      surface: 'page',
      resources: '*',
    },
    render: () => <aside />,
  },
});
