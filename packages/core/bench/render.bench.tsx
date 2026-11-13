import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { bench, describe } from 'vitest';
import { z } from 'zod';
import { reactNode } from '@jfdevelops/react-layout-adapter-zod';
import { defineResourceLayout } from '../src';

function defineLayout() {
  return defineResourceLayout({
    resources: ['users', 'posts', 'comments'],
    options: {
      title: z.string(),
      description: reactNode().optional(),
      count: z.number().default(0),
    },
    layout: {
      composables: (create) => ({
        Layout: create({
          name: ({ capitalize, resource }) => `${capitalize(resource)}Layout`,
          wrapWith: 'main',
        }),
        Header: create({
          name: ({ capitalize, resource }) => `${capitalize(resource)}Header`,
          wrapWith: 'header',
        }),
      }),
      props: {
        include: {
          title: true,
          description: 'optional',
          count: 'optional',
        },
        custom: {
          footer: reactNode().optional(),
        },
      },
      render: (
        { title, description, count, footer, children },
        { composables },
      ) => (
        <composables.Layout>
          <composables.Header>{title}</composables.Header>
          <p>{description}</p>
          <span>{count}</span>
          <section>{children}</section>
          <footer>{footer}</footer>
        </composables.Layout>
      ),
    },
  });
}

const container = document.createElement('div');
const { createResourceLayout } = defineLayout();
const Users = createResourceLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
  description: 'Everyone',
});

describe('resource layout', () => {
  bench('define a layout and create one resource component', () => {
    defineLayout().createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Users',
    });
  });

  bench('mount and unmount a created layout', () => {
    const root = createRoot(container);

    flushSync(() => {
      root.render(<Users footer='Footer'>Content</Users>);
    });
    root.unmount();
  });

  const mounted = createRoot(document.createElement('div'));
  let tick = 0;

  bench('re-render a mounted layout with new props', () => {
    tick += 1;
    flushSync(() => {
      mounted.render(<Users footer={`Footer ${tick}`}>Content</Users>);
    });
  });
});
