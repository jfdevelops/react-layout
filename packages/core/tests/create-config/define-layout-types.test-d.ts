import { createProp, defineResourceLayout } from '../../src';

const { createResourceLayout } = defineResourceLayout({
  resources: ['users', 'admins', 'posts'],
  options: {},
  layout: {
    render: () => null as never,
  },
});

const usersResourceLayout = createResourceLayout.forResource('users');
usersResourceLayout({ name: 'UsersPage' });

const namedUsersResourceLayout = createResourceLayout.forResource({
  resource: 'users',
  name: (resource) => {
    const capitalizedResource: 'Users' = resource;
    const lowercaseResource: 'users' = resource.toLowerCase();

    void capitalizedResource;
    void lowercaseResource;
    return `${resource}Page`;
  },
});
const NamedUsersPage = namedUsersResourceLayout();
const namedUsersPageName: 'UsersPage' = NamedUsersPage.displayName;

const mappedUsersResourceLayout = createResourceLayout.forResource({
  resource: 'users',
  name: {
    users: (resource) => `${resource.toLowerCase()}Directory`,
  },
});
const MappedResourceUsersPage = mappedUsersResourceLayout();
const mappedResourceUsersPageName: 'usersDirectory' =
  MappedResourceUsersPage.displayName;

const keyedAdminsResourceLayout = createResourceLayout.forResource({
  admins: {
    name: (resource) => `${resource.toLowerCase()}Directory`,
  },
});
const KeyedAdminsPage = keyedAdminsResourceLayout();
const keyedAdminsPageName: 'adminsDirectory' =
  KeyedAdminsPage.displayName;

// @ts-expect-error unknown resources cannot be used
createResourceLayout.forResource('comments');
// @ts-expect-error unknown resources cannot be used in keyed notation
createResourceLayout.forResource({ comments: {} });
// @ts-expect-error keyed notation accepts exactly one resource
createResourceLayout.forResource({ users: {}, admins: {} });
// @ts-expect-error name callbacks must return strings
createResourceLayout.forResource({ resource: 'users', name: () => 123 });
// @ts-expect-error name maps only accept the selected resource
createResourceLayout.forResource({ resource: 'users', name: { admins: 'AdminsPage' } });
// @ts-expect-error mapped name callbacks must return strings
createResourceLayout.forResource({ resource: 'users', name: { users: () => 123 } });
// @ts-expect-error keyed name callbacks must return strings
createResourceLayout.forResource({ users: { name: () => 123 } });

const resourceArgumentLayouts = createResourceLayout.forResources(
  'users',
  'admins',
);
resourceArgumentLayouts({ resource: 'users', name: 'UsersPage' });
resourceArgumentLayouts.forResource({
  resource: 'admins',
  name: 'AdminsPage',
});
// @ts-expect-error a name is required when no default was configured
resourceArgumentLayouts({ resource: 'users' });
// @ts-expect-error unselected resources cannot be used
resourceArgumentLayouts({ resource: 'posts', name: 'PostsPage' });
// @ts-expect-error forResources is intentionally omitted from scoped factories
resourceArgumentLayouts.forResources('users');
// @ts-expect-error makeComposable is omitted when the layout has no composables
resourceArgumentLayouts.makeComposable({
  resource: 'users',
  name: 'UsersPage',
});

const sharedOptionsLayouts = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: (resource) => {
    const capitalizedResource: 'Users' | 'Admins' = resource;
    const lowercaseResource: 'users' | 'admins' =
      resource.toLowerCase();

    void capitalizedResource;
    return `${lowercaseResource}Test`;
  },
});
const SharedUsersPage = sharedOptionsLayouts({ resource: 'users' });
const sharedUsersName: 'usersTest' | 'adminsTest' =
  SharedUsersPage.displayName;

const capitalizedSharedLayouts = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: (resource) => `${resource}Test`,
});
const CapitalizedSharedUsersPage = capitalizedSharedLayouts({
  resource: 'users',
});
const capitalizedSharedUsersName: 'UsersTest' | 'AdminsTest' =
  CapitalizedSharedUsersPage.displayName;

const resourceOptionsLayouts = createResourceLayout.forResources({
  users: {
    name: (resource) => {
      const usersResource: 'Users' = resource;
      const lowercaseUsersResource: 'users' = resource.toLowerCase();

      void usersResource;
      return `${lowercaseUsersResource}Test`;
    },
  },
});
const ResourceOptionsUsersPage = resourceOptionsLayouts({ resource: 'users' });
const resourceOptionsUsersName: 'usersTest' =
  ResourceOptionsUsersPage.displayName;
// @ts-expect-error resources omitted from object notation cannot be used
resourceOptionsLayouts({ resource: 'admins', name: 'AdminsPage' });

const mappedNameLayouts = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: {
    users: (resource) => {
      const usersResource: 'Users' = resource;

      void usersResource;
      return `${resource.toLowerCase()}Page`;
    },
    admins: 'AdminsPage',
  },
});
const MappedUsersPage = mappedNameLayouts({ resource: 'users' });
const mappedUsersName: 'usersPage' = MappedUsersPage.displayName;
const MappedAdminsPage = mappedNameLayouts({ resource: 'admins' });
const mappedAdminsName: 'AdminsPage' = MappedAdminsPage.displayName;

const partialMappedNameLayouts = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: {
    users: 'UsersPage',
  },
});
partialMappedNameLayouts({ resource: 'users' });
// @ts-expect-error resources without a mapped default still require a name
partialMappedNameLayouts({ resource: 'admins' });
partialMappedNameLayouts({ resource: 'admins', name: 'AdminsPage' });

createResourceLayout.forResources({
  resources: ['users'],
  name: (resource) => `${resource}Page`,
});
createResourceLayout.forResources({ users: { name: 'UsersPage' } });

// @ts-expect-error the resources-array form no longer accepts a shared string
createResourceLayout.forResources({ resources: ['users'], name: 'UsersPage' });
// @ts-expect-error name maps only accept selected resource keys
createResourceLayout.forResources({ resources: ['users'], name: { admins: 'AdminsPage' } });
// @ts-expect-error name map values must be strings or callbacks
createResourceLayout.forResources({ resources: ['users'], name: { users: 123 } });

// @ts-expect-error shared name callbacks must return a string
createResourceLayout.forResources({ resources: ['users'], name: () => 123 });
// @ts-expect-error per-resource name callbacks must return a string
createResourceLayout.forResources({ users: { name: () => 123 } });

const { createResourceLayout: createResourceLayoutWithRequiredProps } =
  defineResourceLayout({
    resources: ['users'],
    options: {
      title: createProp.string(),
    },
    layout: {
      props: {
        include: {
          title: true,
        },
      },
      render: () => null as never,
    },
  });
const createRequiredUsersPage =
  createResourceLayoutWithRequiredProps.forResource({
    resource: 'users',
    name: 'UsersPage',
  });
// @ts-expect-error required layout props still require an options argument
createRequiredUsersPage();
createRequiredUsersPage({ title: 'Users' });

// @ts-expect-error unknown resource argument
createResourceLayout.forResources('comments');
// @ts-expect-error unknown resource in shared options
createResourceLayout.forResources({ resources: ['comments'] });
// @ts-expect-error unknown resource in object notation
createResourceLayout.forResources({ comments: {} });
// @ts-expect-error unknown resource mixed into object notation
createResourceLayout.forResources({ users: {}, comments: {} });

void sharedUsersName;
void namedUsersPageName;
void mappedResourceUsersPageName;
void keyedAdminsPageName;
void capitalizedSharedUsersName;
void resourceOptionsUsersName;
void mappedUsersName;
void mappedAdminsName;
