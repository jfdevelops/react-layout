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

const [hashedGroup] = createResourceLinks.withGroup([
  {
    links: {
      posts: { label: 'Posts', hash: 'articles' },
    },
  },
]);

const [hashedLink] = hashedGroup.links;

const _hashedPostResource: 'posts' = hashedLink.resource;
const _hashedPostIcon = hashedLink.icon;
const _hashedPostHash: string = hashedLink.href.hash;

createResourceLinks.withGroup([
  {
    label: 'Directory',
    links: {
      // @ts-expect-error links must match createResourceLinks config
      invalid: { label: 'Invalid' },
    },
  },
]);

const _groupsWithoutLabel = createResourceLinks.withGroup([
  {
    links: {
      users: { label: 'Users' },
    },
  },
]);

void _hashedPostResource;
void _hashedPostIcon;
void _hashedPostHash;
void _withGroup;
void _groups;
void _groupsWithoutLabel;
