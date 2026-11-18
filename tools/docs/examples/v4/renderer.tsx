import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceConfig } = defineResourceLayout({
  resources: ['trash'],
  layout: {
    render: () => <main />,
  },
});

const pages = createResourceConfig({
  trash: {
    component: <p>Trash</p>,
    pendingComponent: <p>Loading trash…</p>,
  },
});

const renderPage = pages.createRenderer({
  params: {
    include: {
      keys: true,
    },
  },
  render: ({ getComponentForPath, path, params }) => {
    const getComponents = getComponentForPath(path);
    const components = getComponents();

    return components[params.componentKey];
  },
  displayName: ({ path, params }) => `${path}Page${params.componentKey}`,
  factory: {
    render:
      (_props, { context: { Component, componentKey } }) =>
      () => <Component componentKey={componentKey} />,
  },
});

const renderTrash = renderPage('trash');

export const routeOptions = {
  component: renderTrash({
    component: 'component',
  }),
  pendingComponent: renderTrash({
    component: 'pendingComponent',
  }),
};
