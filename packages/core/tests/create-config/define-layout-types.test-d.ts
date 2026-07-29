import type { JSX, ReactNode } from 'react';
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

const { createResourceLayout: createComponentResourceLayout } =
  defineResourceLayout({
    resources: ['users', 'admins', 'posts'],
    options: {
      description: createProp.string(),
      title: createProp.string(),
    },
    layout: {
      props: {
        custom: {
          actions: createProp.component({ type: 'ReactNode' }),
        },
      },
      render: () => null as never,
    },
  });
const createDirectoryLayout =
  createComponentResourceLayout.forResources('users', 'admins');
const targetResource = null as unknown as typeof createDirectoryLayout.resources;
const selectedTargetResource: 'users' | 'admins' = targetResource;
const UsersResourcePage = createDirectoryLayout({
  description: 'Manage users',
  name: 'UsersPage',
  resource: 'users',
  title: 'Users',
});
const AdminsResourcePage = createDirectoryLayout({
  description: 'Manage admins',
  name: 'AdminsPage',
  resource: 'admins',
  title: 'Admins',
});
const PostsResourcePage = createComponentResourceLayout({
  description: 'Manage posts',
  name: 'PostsPage',
  resource: 'posts',
  title: 'Posts',
});
const usersResourcePageResource: 'users' = UsersResourcePage.resource;
const Directory = createDirectoryLayout.createComponent({
  props: {
    include: {
      actions: 'optional',
      description: 'optional',
      title: true,
    },
    custom: {
      eyebrow: createProp.string().optional(),
    },
  },
  resources: {
    users: {
      description: 'Manage users',
      title: 'Users',
      render: (props) => {
        const resource: 'users' = props.resource;

        void resource;
        return null as never;
      },
    },
    admins: {
      description: 'Manage admins',
      title: 'Admins',
      render: (props) => {
        const resource: 'admins' = props.resource;

        void resource;
        return null as never;
      },
    },
  },
  render: (props, context) => {
    const actions: ReactNode | undefined = props.actions;
    const children: ReactNode | undefined = props.children;
    const description: string | undefined = props.description;
    const resource: 'users' | 'admins' = props.resource;
    const title: string = props.title;
    const Users: () => JSX.Element = context.Users;
    const Admins: () => JSX.Element = context.Admins;

    void actions;
    void Admins;
    void children;
    void description;
    void resource;
    void title;
    void Users;
    return null as never;
  },
});

// Call sites infer everything; no explicit type arguments are ever needed.
Directory({ resource: 'users', title: 'Users' });
Directory({
  actions: null,
  children: null,
  description: 'Manage admins',
  eyebrow: 'Directory',
  resource: 'admins',
  title: 'Admins',
});
// @ts-expect-error required included props remain required at the call site
Directory({ resource: 'users' });
// @ts-expect-error resources outside the scope are rejected by the resource prop
Directory({ resource: 'posts', title: 'Posts' });
// @ts-expect-error include only accepts props from the layout definition
createDirectoryLayout.createComponent({ props: { include: { missing: true } }, render: () => null as never });
// @ts-expect-error custom renders only accept selected resource keys
createDirectoryLayout.createComponent({ resources: { posts: { render: () => null as never } }, render: () => null as never });

const ComponentWithoutProps = createDirectoryLayout.createComponent({
  render: (props) => {
    const children: ReactNode | undefined = props.children;
    const resource: 'users' | 'admins' = props.resource;

    void children;
    void resource;
    return null as never;
  },
});
ComponentWithoutProps({ resource: 'users' });

// The render context exposes only the resources defined in the options object.
const PartialDirectory = createDirectoryLayout.createComponent({
  props: { include: { title: true } },
  resources: {
    users: {
      description: 'Manage users',
      title: 'Users',
      render: (props) => {
        const resource: 'users' = props.resource;

        void resource;
        return null as never;
      },
    },
  },
  render: (props, context) => {
    // The `resource` prop still accepts every resource in the scope.
    const resource: 'users' | 'admins' = props.resource;
    const Users: () => JSX.Element = context.Users;
    const Root: (props: {
      actions: ReactNode;
      children?: ReactNode;
    }) => JSX.Element = context.Root;

    // @ts-expect-error admins has no entry, so it is absent from the context
    context.Admins;

    void resource;
    void Root;
    void Users;
    return null as never;
  },
});
PartialDirectory({
  resource: 'admins',
  title: 'Admins',
});

// @ts-expect-error resource entries reject unknown layout options
createDirectoryLayout.createComponent({ resources: { users: { bogus: true, render: () => null as never } }, render: () => null as never });
// @ts-expect-error resource entries require a render function
createDirectoryLayout.createComponent({ resources: { users: { title: 'Users' } } , render: () => null as never });
// @ts-expect-error the shared render function is required
createDirectoryLayout.createComponent({ resources: { users: { render: () => null as never } } });
// @ts-expect-error per-resource entries are nested under `resources`
createDirectoryLayout.createComponent({ users: { render: () => null as never }, render: () => null as never });

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
void selectedTargetResource;
void usersResourcePageResource;
