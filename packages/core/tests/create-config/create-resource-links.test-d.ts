import { defineResourceLayout } from '../../src';

const { createResourceLinks } = defineResourceLayout({
  resources: ['users', 'posts'],
  options: {},
  layout: {
    render: () => null!,
  },
});

const _withGroup = createResourceLinks.withGroup;

const _groups = createResourceLinks.withGroup([
  {
    label: 'Directory',
    links: {
      users: { label: 'Users' },
      posts: { label: 'Posts', hash: 'articles' },
    },
  },
  {
    label: 'Settings',
    links: {
      users: { label: 'User Settings', hash: 'user-settings' },
    },
  },
]);

createResourceLinks.withGroup([
  {
    label: 'Directory',
    links: {
      // @ts-expect-error links must match createResourceLinks config
      invalid: { label: 'Invalid' },
    },
  },
]);

void _withGroup;
void _groups;
