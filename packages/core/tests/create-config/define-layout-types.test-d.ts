import type { JSX, ReactNode } from 'react';
import { createProp, defineResourceLayout } from '../../src';
import { testResourceLayout } from './helpers';

// @ts-expect-error forResources requires at least one resource
defineResourceLayout.forResources();

const { createResourceLayout: sharedCreateResourceLayout } = testResourceLayout({
  layout: {
    render: () => null as never,
  },
});

const BoundSharedUsersPage = sharedCreateResourceLayout.forResource('users')();
const sharedUsersResource: 'users' = BoundSharedUsersPage.resource;

const { createResourceLayout: extendedCreateResourceLayout } = testResourceLayout(
  {
    resources: ['admins'],
    layout: {
      render: () => null as never,
    },
  },
);

const ExtendedAdminsPage =
  extendedCreateResourceLayout.forResource('admins')();
const extendedAdminsResource: 'admins' = ExtendedAdminsPage.resource;
const ExtendedUsersPage = extendedCreateResourceLayout.forResource('users')();
const extendedUsersResource: 'users' = ExtendedUsersPage.resource;

void sharedUsersResource;
void extendedAdminsResource;
void extendedUsersResource;

const { createResourceLayout } = testResourceLayout({
  resources: ['admins'],
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
  testResourceLayout({
    resources: ['admins'],
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
      render: (props) => {
        const resource: 'users' = props.resource;

        void resource;
        return null as never;
      },
    },
    admins: {
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
    const Users: (props: {
      title: string;
      description?: string;
      actions?: ReactNode;
      eyebrow?: string;
      children?: ReactNode;
    }) => JSX.Element = context.Users;
    const Admins: (props: {
      title: string;
      description?: string;
      actions?: ReactNode;
      eyebrow?: string;
      children?: ReactNode;
    }) => JSX.Element = context.Admins;

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
    const Users: (props: { title: string }) => JSX.Element = context.Users;
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

// asHOF binds one resource; the bound component drops the `resource` prop.
const createDirectory = Directory.asHOF();
const UsersDirectory = createDirectory('users');
const boundResource: 'users' = UsersDirectory.resource;

UsersDirectory({ title: 'Users' });
UsersDirectory({
  actions: null,
  children: null,
  description: 'Manage users',
  eyebrow: 'Directory',
  title: 'Users',
});
// @ts-expect-error the bound component no longer accepts a resource prop
UsersDirectory({ resource: 'users', title: 'Users' });
// @ts-expect-error required included props remain required on the bound component
UsersDirectory({});
// @ts-expect-error resources outside the scope cannot be bound
createDirectory('posts');

void boundResource;

// Scoped components declared under a resource entry.
const ScopedDirectory = createDirectoryLayout.createComponent({
  props: { include: { title: true } },
  resources: {
    users: {
      components: {
        Toolbar: {
          render: (props, components) => {
            // Layout props and the narrowed resource are typed here.
            const title: string = props.title;
            const resource: 'users' = props.resource;
            const Footer: (props: { label: string }) => JSX.Element =
              components.Footer;
            // @ts-expect-error a scoped component is omitted from its own siblings
            components.Toolbar;

            void title;
            void resource;
            void Footer;
            return null as never;
          },
        },
        Footer: {
          props: { label: createProp.string() },
          render: (props, components) => {
            const label: string = props.label;
            const Toolbar: () => JSX.Element = components.Toolbar;
            // @ts-expect-error a scoped component is omitted from its own siblings
            components.Footer;

            void label;
            void Toolbar;
            return null as never;
          },
        },
      },
      render: (props, components) => {
        const resource: 'users' = props.resource;
        const Toolbar: () => JSX.Element = components.Toolbar;
        const Footer: (props: { label: string }) => JSX.Element =
          components.Footer;

        void resource;
        void Toolbar;
        void Footer;
        return null as never;
      },
    },
    admins: {
      render: (_props, components) => {
        // @ts-expect-error admins declared no scoped components
        components.Toolbar;
        return null as never;
      },
    },
  },
  render: (props, context) => {
    const resource: 'users' | 'admins' = props.resource;
    const Toolbar: () => JSX.Element = context.Users.Toolbar;

    // Declared props are precisely typed at the call site.
    context.Users.Footer({ label: 'end' });
    // @ts-expect-error Footer requires its declared label prop
    context.Users.Footer({});
    // @ts-expect-error admins declared no scoped components
    context.Admins.Toolbar;

    void resource;
    void Toolbar;
    return null as never;
  },
});

// Scoped components are also statics on a bound component.
const BoundUsers = ScopedDirectory.asHOF()('users');
const boundToolbar: () => JSX.Element = BoundUsers.Toolbar;

BoundUsers({ title: 'Users' });
void boundToolbar;

// Components with declared props reverse-infer the props object (not
// `render: unknown`), so call-site signatures stay precise.
const PropsInferredDirectory = createDirectoryLayout.createComponent({
  props: { include: { title: true } },
  resources: {
    users: {
      components: {
        Widget: {
          props: { label: createProp.string() },
          render: ({ label }) => {
            const typedLabel: string = label;
            void typedLabel;
            return null as never;
          },
        },
      },
      render: (_props, components) => {
        const Widget: (props: { label: string }) => JSX.Element =
          components.Widget;
        // @ts-expect-error Widget requires its declared label prop
        components.Widget({});

        void Widget;
        return null as never;
      },
    },
  },
  render: (_props, context) => {
    context.Users.Widget({ label: 'ok' });
    return null as never;
  },
});
void PropsInferredDirectory;

// When render returns a component type, call-site props and compound statics
// are inferred from that return type — no helper and no explicit return type.
// Runtime must also expose those statics (see withScopedCompoundStatics).
const ComponentReturnDirectory = createDirectoryLayout.createComponent({
  props: { include: { title: true } },
  resources: {
    users: {
      components: {
        DataTable: {
          render: function UsersDataTable() {
            function Table(props: { caption: string; rows: number }) {
              void props;
              return null as never;
            }
            function Loading() {
              return null as never;
            }
            return Object.assign(Table, { Loading });
          },
        },
      },
      render: function UsersContent(_props, components) {
        components.DataTable({ caption: 'listed', rows: 1 });
        // @ts-expect-error DataTable requires props from the returned component
        components.DataTable({});
        components.DataTable.Loading();
        return null as never;
      },
    },
  },
  render: function DirectoryRender(_props, context) {
    context.Users.DataTable({ caption: 'x', rows: 2 });
    // @ts-expect-error DataTable requires props from the returned component
    context.Users.DataTable({});
    context.Users.DataTable.Loading();
    return null as never;
  },
});
void ComponentReturnDirectory;

// Declared `props` and render-return compound statics infer independently.
const ComponentReturnWithDeclaredPropsDirectory =
  createDirectoryLayout.createComponent({
    props: { include: { title: true } },
    resources: {
      users: {
        components: {
          DataTable: {
            props: {
              variant: createProp
                .string()
                .literal('a')
                .or(createProp.string().literal('b')),
            },
            render: function UsersDataTable({ variant }) {
              const typedVariant: 'a' | 'b' = variant;
              void typedVariant;
              function Table() {
                return null as never;
              }
              function Loading() {
                return null as never;
              }
              return Object.assign(Table, { Loading });
            },
          },
        },
        render: function UsersContent(_props, components) {
          components.DataTable({ variant: 'b' });
          components.DataTable.Loading();
          // @ts-expect-error DataTable requires its declared variant prop
          components.DataTable({});
          return null as never;
        },
      },
    },
    render: function DirectoryRender(_props, context) {
      context.Users.DataTable({ variant: 'a' });
      context.Users.DataTable.Loading();
      // @ts-expect-error DataTable requires its declared variant prop
      context.Users.DataTable({});
      return null as never;
    },
  });
const BoundUsersWithDeclaredProps =
  ComponentReturnWithDeclaredPropsDirectory.asHOF()('users');
const preciseDataTable: ((props: {
  readonly variant: 'a' | 'b';
}) => JSX.Element) & {
  Loading: () => JSX.Element;
} = BoundUsersWithDeclaredProps.DataTable;
BoundUsersWithDeclaredProps.DataTable({ variant: 'a' });
BoundUsersWithDeclaredProps.DataTable.Loading();
// @ts-expect-error DataTable requires its declared variant prop on asHOF()
BoundUsersWithDeclaredProps.DataTable({});
void preciseDataTable;
void ComponentReturnWithDeclaredPropsDirectory;

// Top-level createComponent render return type also feeds call-site props
// (ScopedResourceComponentCallProps), same idea as scoped components.
const TopLevelReturnDirectory = createDirectoryLayout.createComponent({
  props: { include: { title: true } },
  resources: {
    users: {
      render: () => null as never,
    },
  },
  render: function DirectoryRender() {
    function Shell(props: { requiredProp: string }) {
      void props;
      return null as never;
    }
    return Shell;
  },
});
TopLevelReturnDirectory({
  resource: 'users',
  title: 'Users',
  requiredProp: 'x',
});
// @ts-expect-error requiredProp comes from the returned component type
TopLevelReturnDirectory({ resource: 'users', title: 'Users' });
const BoundTopLevel = TopLevelReturnDirectory.asHOF()('users');
BoundTopLevel({ title: 'Users', requiredProp: 'y' });
// @ts-expect-error bound component still requires props from the returned type
BoundTopLevel({ title: 'Users' });
void BoundTopLevel;

// createComponent props keep declared names — including JSX.Element slots.
const { createResourceLayout: createJsxSlotLayout } = testResourceLayout({
  options: {
    actions: createProp.component({ type: 'JSX.Element' }),
    title: createProp.string(),
  },
  layout: {
    props: {
      include: { actions: true, title: true },
    },
    render: () => null as never,
  },
});
const JsxSlotDirectory = createJsxSlotLayout.forResources('users').createComponent({
  props: {
    include: { actions: true, title: true },
    custom: {
      badge: createProp.component({ type: 'JSX.Element' }),
    },
  },
  resources: {
    users: {
      render: (props) => {
        const actions: () => JSX.Element = props.actions;
        const badge: JSX.Element = props.badge;
        // @ts-expect-error declared keys are not capitalized
        props.Actions;
        // @ts-expect-error declared keys are not capitalized
        props.Badge;

        void actions;
        void badge;
        return null as never;
      },
    },
  },
  render: (props, context) => {
    const actions: () => JSX.Element = props.actions;
    const badge: JSX.Element = props.badge;
    // @ts-expect-error declared keys are not capitalized
    props.Actions;
    // @ts-expect-error declared keys are not capitalized
    props.Badge;

    void actions;
    void badge;
    void context;
    return null as never;
  },
});
JsxSlotDirectory({
  resource: 'users',
  title: 'Users',
  actions: () => null as never,
  badge: null as never,
});
JsxSlotDirectory({
  resource: 'users',
  title: 'Users',
  // @ts-expect-error call site uses the declared key, not Actions
  Actions: () => null as never,
  badge: null as never,
});

// @ts-expect-error resource entries reject unknown layout options
createDirectoryLayout.createComponent({ resources: { users: { bogus: true, render: () => null as never } }, render: () => null as never });
// @ts-expect-error resource entries reject layout option fields like title
createDirectoryLayout.createComponent({ resources: { users: { title: 'Users', render: () => null as never } }, render: () => null as never });
// @ts-expect-error resource entries require a render function
createDirectoryLayout.createComponent({ resources: { users: { name: 'Users' } } , render: () => null as never });
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
  testResourceLayout({
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

const createSharedDirectory = createDirectoryLayout.createComponent.setProps({
  include: {
    title: true,
  },
  custom: {
    heading: createProp.string(),
  },
});
const sharedUsersEntry = createSharedDirectory.createResourceComponents({
  resource: 'users',
  props: {
    include: {
      description: 'optional',
    },
  },
  render: (props) => {
    const title: string = props.title;
    const heading: string = props.heading;
    const description: string | undefined = props.description;
    // @ts-expect-error title is string (not any) — any would allow this call
    props.title.definitelyNotAMethod();

    void title;
    void heading;
    void description;
    return null as never;
  },
});
createSharedDirectory.createResourceComponents({
  resource: 'users',
  // @ts-expect-error setProps already defined title
  props: { include: { title: true } },
  render: () => null as never,
});
const SharedDirectory = createSharedDirectory({
  props: {
    include: {
      description: 'optional',
    },
  },
  resources: {
    users: sharedUsersEntry,
  },
  render: (props, context) => {
    const title: string = props.title;
    const heading: string = props.heading;
    const Users: (props: {
      title: string;
      heading: string;
      description?: string;
      children?: ReactNode;
    }) => JSX.Element = context.Users;

    void title;
    void heading;
    void Users;
    return null as never;
  },
});
SharedDirectory({ resource: 'users', title: 'Users', heading: 'Team' });
// @ts-expect-error heading from setProps custom remains required
SharedDirectory({ resource: 'users', title: 'Users' });
createSharedDirectory({
  // @ts-expect-error setProps already defined title on the thunk
  props: { include: { title: true } },
  render: () => null as never,
});

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
