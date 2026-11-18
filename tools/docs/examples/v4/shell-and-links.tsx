import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';

const { Shell, createResourceLayout, createResourceLinks } =
  defineResourceLayout.withLayout({
    resources: ['users', 'posts'],
    options: {
      title: z.string().optional(),
    },
    shell: {
      render: (_props, { resources, children }) => (
        <div>
          <nav>{resources.current ?? 'home'}</nav>
          <main>{children}</main>
        </div>
      ),
    },
    layout: {
      render: ({ children }) => <section>{children}</section>,
    },
  });

export const UsersPage = createResourceLayout.forResource({
  resource: 'users',
  name: 'UsersPage',
})();

export const links = createResourceLinks({
  users: {
    label: 'Users',
    href: (resource) => `/${resource}`,
  },
  posts: {
    label: 'Posts',
  },
});

export function App() {
  return (
    <Shell>
      <UsersPage />
    </Shell>
  );
}
