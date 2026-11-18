import { defineResourceLayout } from '@jfdevelops/react-layout';
import {
  createHeaderComposable,
  createMetaComposable,
} from '@jfdevelops/react-layout-composable-copy';
import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-navigation';

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  layout: {
    composables: () => ({
      ...createHeaderComposable(({ title, description }) => (
        <header>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
      )),
      ...createMetaComposable(({ title, description }) => (
        <p>{`${title} | ${description}`}</p>
      )),
      ...createBreadcrumbComposable(({ segments }) => (
        <nav>{Object.keys(segments).join(' / ')}</nav>
      )),
    }),
    props: {
      include: {
        title: true,
        description: true,
        segments: true,
      },
    },
    render: (props, { composables }) => (
      <main>
        <composables.Meta title={props.title} description={props.description} />
        <composables.Breadcrumb segments={props.segments} />
        <composables.Header
          title={props.title}
          description={props.description}
        />
      </main>
    ),
  },
});

export const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
  description: 'Manage users',
  segments: {
    users: 'Users',
  },
});
