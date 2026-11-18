import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactElement, reactNode } from '@jfdevelops/react-layout-adapter-zod';

const optionsSchema = z.object({
  title: z.string().min(1),
  description: reactNode(),
  icon: reactElement().optional(),
});

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: optionsSchema,
  layout: {
    props: {
      include: {
        title: true,
        description: true,
        icon: 'optional',
      },
      custom: {
        footer: reactNode(),
      },
    },
    render: ({ title, description, icon, footer }) => (
      <main>
        <h1>
          {icon}
          {title}
        </h1>
        {description}
        <footer>{footer}</footer>
      </main>
    ),
  },
});

export const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
  description: <p>Manage users</p>,
});
