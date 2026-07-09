import { defineResourceLayout } from '../../src';

const { createResourceLinks } = defineResourceLayout({
  resources: ['users', 'posts'],
  options: {},
  layout: {
    render: () => null!,
  },
});

const _withGroups = createResourceLinks.withGroups;

const _groups = createResourceLinks.withGroups([
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

const [hashedGroup] = createResourceLinks.withGroups([
  {
    links: {
      posts: { label: 'Posts', hash: 'articles' },
    },
  },
]);

const [hashedLink] = hashedGroup.links;

const _hashedPostResource: 'users' | 'posts' = hashedLink.resource;
const _hashedPostIcon = hashedLink.icon;
const _hashedPostHash =
  'hash' in hashedLink.href ? hashedLink.href.hash : undefined;

createResourceLinks.withGroups([
  {
    label: 'Directory',
    links: {
      // @ts-expect-error links must match createResourceLinks config
      invalid: { label: 'Invalid' },
    },
  },
]);

const _groupsWithoutLabel = createResourceLinks.withGroups([
  {
    links: {
      users: { label: 'Users' },
    },
  },
]);

void _hashedPostResource;
void _hashedPostIcon;
void _hashedPostHash;
const _groupId: string = hashedGroup.id;

const navItems = createResourceLinks.withGroups([
  {
    label: 'Directory',
    links: {
      users: { label: 'Users' },
      posts: { label: 'Posts', hash: 'articles' },
    },
  },
  {
    links: {
      users: { label: 'User Settings', hash: 'user-settings' },
    },
  },
]);

navItems.map((group) =>
  group.links.map(({ label, icon, resource }) => {
    void label;
    void icon;
    void resource;
  }),
);

void _withGroups;
void _groups;
void _groupId;
void _groupsWithoutLabel;
