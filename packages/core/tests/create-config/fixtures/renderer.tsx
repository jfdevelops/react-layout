import { defineResourceLayout } from '../../../src';

const { createResourceConfig } = defineResourceLayout({
  resources: [
    {
      value: 'containers',
      subResources: ['$containerId'],
    },
    'trash',
  ],
  layout: {
    render: () => <main />,
  },
});
export const pages = createResourceConfig({
  containers: {
    component: <p>Containers</p>,
    $containerId: {
      component: <p>Container</p>,
      errorComponent: <p>Container error</p>,
    },
  },
  trash: {
    component: <p>Trash</p>,
    pendingComponent: <p>Trash pending</p>,
  },
});
