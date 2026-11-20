---
title: Route components
description: Describe the components for each route once, look them up by path, and bind scoped components to one resource.
order: 70
---

Routers usually want a component per route and per route state: the page, its error
view, its pending view. A resource config stores those components by resource. Shared
resource renderers (`createRenderer`) do not exist in v1; they were added in 3.1.0. See
[the v3 guide](../../v3/guides/route-components.md).

In this guide you will:

- build a resource config
- look components up by resource or by path
- bind scoped components to one resource

## Build a resource config

`createResourceConfig` comes from your definition. Key it by resource and give each entry
component slots.

| Slot                | Holds                                         |
| ------------------- | --------------------------------------------- |
| `component`         | The page.                                     |
| `errorComponent`    | The error view.                               |
| `pendingComponent`  | The pending view.                             |
| `notFoundComponent` | The not-found view.                           |
| `detail`, `new`     | A shared branch with its own set of slots.    |
| other keys          | Sub-resources, keyed directly on their parent |

```tsx
const { createResourceConfig } = defineResourceLayout({
  resources: [{ value: 'users', subResources: ['admins'] }, 'groups'],
  layout: { render: () => <main /> },
});

const config = createResourceConfig({
  users: {
    component: <p>Users</p>,
    errorComponent: <p>Users failed</p>,
    detail: { component: <p>User detail</p> },
    admins: { component: <p>Admins</p> },
  },
  groups: { component: <p>Groups</p> },
});

config.getComponent({ resource: 'users', subResource: 'admins' });
config.createGetComponent('$resource.detail.$component')({
  resource: 'users',
  component: 'component',
});
```

Resource configs can be assembled across files. Use
`createResourceConfig.forResource('users', { component: <Users /> })` to make a fragment
you spread into the final config. That form arrived in 1.0.0.

## Look components up

- `config.getComponent(options)` resolves one component. Nest `subResource` as
  `{ value, subResource }` for deeper levels. It also accepts a deep path.
- `config.createGetComponent(path)` returns a getter for a path pattern. `$resource`,
  `$subResource` and `$component` are variables, and a fixed segment narrows the allowed
  resources to those that configure it.
- `config.forPaths(...)` is a builder with `addPathParams`, `addComponentKeyParams`,
  `addParams`, `render`, `setDisplayName` and `asHOF`.
- A slot that is not configured on the resolved node returns `null`.
- Invalid lookups throw typed errors: `InvalidPathError`, `InvalidResourceError`,
  `InvalidSubResourceError`, `InvalidComponentError`, `MissingPathVariableError` and
  `InvalidConfigError`. All extend `ReactLayoutError`.

## Scoped components

`forResources(...).createComponent` makes one component that serves several resources.
`asHOF()` binds a resource once.

```tsx
const Directory = createResourceLayout
  .forResources('users', 'admins')
  .createComponent({
    props: { include: { title: true } },
    resources: {
      users: { title: 'Users', render: () => <UsersTable /> },
      admins: { title: 'Admins', render: () => <AdminsTable /> },
    },
    render: ({ resource }, context) => (
      <context.Root>
        {resource === 'users' ? <context.Users /> : <context.Admins />}
      </context.Root>
    ),
  });

const UsersDirectory = Directory.asHOF()('users');
```

What to know:

- `context.Root` is the layout for the current resource, built from that entry's options.
  Rendering it needs an entry for the current resource.
- Each entry can register `components`, available as `context.Users.Toolbar` and as
  statics on the bound component.
- `asHOF()('users')` removes `resource` from the props. Binding is cached, so rebinding
  during render never remounts the subtree.
- Reserved scoped component names are the component object's own statics such as `props`,
  `resource` and `displayName`, plus `Function.prototype` members such as `name` and `call`.
  (`makeComposable` and `state` became reserved in later majors.) A resource whose capitalized
  name is `Root` is rejected because `Root` is the layout key.

## Next steps

- [Lazy loading](./lazy-loading.md)
