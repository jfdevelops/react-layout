---
title: Route components and renderers
description: Describe the components for each route once, look them up by path, and share one renderer across routes.
order: 70
---

Routers usually want a component per route and per route state: the page, its
error view, its pending view. A resource config stores those components by
resource. A **renderer**, added in 3.1.0, turns a path selection into whatever your
router expects.

In this guide you will:

- build a resource config
- look components up by resource or by path
- create a shared renderer with parameters and a factory
- bind scoped components to one resource

## Build a resource config

`createResourceConfig` comes from your definition. Key it by resource and give each
entry component slots.

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

config.getComponent({ resource: 'users' });
config.getComponent({ resource: 'users', subResource: 'admins' });
config.createGetComponent('$resource.detail.$component')({
  resource: 'users',
  component: 'component',
});
```

Resource configs can be assembled across files.
`createResourceConfig.forResource('users', { component: <Users /> })` returns a
fragment you spread into the final config, and it keeps its resource-specific types.

## Look components up

- `config.getComponent(options)` resolves one component. Nest `subResource` as
  `{ value, subResource }` for deeper levels. It also accepts a deep path.
- `config.createGetComponent(path)` returns a getter for a path pattern.
  `$resource`, `$subResource` and `$component` are variables, and a fixed segment
  narrows the allowed resources to those that configure it.
- `config.forPaths(...)` is a builder with `addParams`, `render`, `setDisplayName`
  and `asHOF`. `addPathParams` and `addComponentKeyParams` are deprecated aliases;
  see [Migration](../migration.md).
- A slot that is not configured on the resolved node returns `null`.
- Invalid lookups throw typed errors: `InvalidPathError`, `InvalidResourceError`,
  `InvalidSubResourceError`, `InvalidComponentError`, `MissingPathVariableError`
  and `InvalidConfigError`. All extend `ReactLayoutError`.

## Share a renderer

`createRenderer` defines how a selected path becomes a value. Only `render` is
required. Without a `factory`, selecting a path returns a configured Component. With a
`factory`, it returns a function that takes the parameters you declared.

```tsx
const renderPage = resourcePageConfig.createRenderer({
  params: { include: { keys: true } },
  render: ({ getComponentForPath, path, params }) =>
    getComponentForPath(path)()[params.componentKey],
  displayName: ({ path, params }) => `${path}Page${params.componentKey}`,
  factory: {
    render:
      (_props, { context: { Component, componentKey } }) =>
      () => <Component componentKey={componentKey} />,
  },
});

const renderTrash = renderPage('trash');
const routeOptions = {
  component: renderTrash('component'),
  pendingComponent: renderTrash('pendingComponent'),
};
```

### Call a factory

In v3 a factory is called as `selectedFactory(parameters, props?)`.

| Declared parameters                  | How you call it                                                     |
| ------------------------------------ | ------------------------------------------------------------------- |
| `componentKey` only                  | `selectedFactory('component')`, shorthand for `{ componentKey: 'component' }` |
| More than one parameter              | `selectedFactory({ componentKey: 'component', title: 'Trash' })`   |
| Nothing required                     | `selectedFactory()`                                                 |
| Required `factory.props`             | The second argument is required: `renderPage('trash')({ title: 'Trash' }, { label: 'Page' })` |

The factory's first callback argument holds validated factory props. The second
argument's `context` holds the configured Component and every validated declared
parameter. Factory results keep their inferred type and runtime identity: thunks,
JSX, primitives and objects all work.

> **Note:** v4 replaced this positional call with one options object. See
> [the v4 migration guide](../../v4/guides/migration.md).

### Configure parameters

`createRenderer.params` and `forPaths(...).addParams(...)` accept `include` and
`custom`. Every property is optional.

| Setting                            | Effect                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `include.path: true`               | Include every path variable as a required parameter.                                         |
| `include.path: { pick, optional }` | Select values from the resource tree (`true` for a branch, nested objects for children) and optionally make them optional. |
| `include.keys: true`               | Include the required `componentKey`.                                                         |
| `custom`                           | A map of synchronous Standard Schemas. Callers pass inputs; callbacks receive outputs.       |

Custom names cannot shadow included parameters or the reserved names `Component`,
`children`, `context`, `path`, `params` and `getComponentForPath`. Collisions are
rejected at definition time and by the type system.

### Select and override

- A direct call selects a page when the node has a component slot. For a parent-only
  node, `renderPage('containers')('$containerId')` equals
  `renderPage('containers.$containerId')`.
- When a node is both a page and a parent, the page wins. Use
  `renderPage.forPath('containers')('$containerId')` to scope explicitly.
- `renderPage.render(callback)` and `scope.render(callback)` create a separate render
  override before factory evaluation. Overrides are immutable. A default Component
  also supports `Component.render(callback)` and `asHOF`.
- Factory outputs expose exactly their inferred return type and acquire no methods.

The `displayName` callback receives `path` as a plain string in v3.

## Scoped components

`forResources(...).createComponent` makes one component that serves several
resources. `asHOF()` binds a resource once.

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

- `context.Root` is the layout for the current resource, built from that entry's
  options. Rendering it needs an entry for the current resource.
- Each entry can register `components`, available as `context.Users.Toolbar` and as
  statics on the bound component.
- `asHOF()('users')` removes `resource` from the props. Binding is cached, so
  rebinding during render never remounts the subtree.
- When the layout defines composables, a bound page also exposes
  `makeComposable({ name })`, with its resource already bound.
- Reserved scoped component names are `makeComposable`, `state`, and the component
  object's own statics such as `props`, `resource` and `displayName`, plus
  `Function.prototype` members such as `name` and `call`. A resource whose capitalized
  name is `Root` is rejected because `Root` is the layout key.

## Next steps

- [Lazy loading](./lazy-loading.md) for lazy scoped content
- [Hosted surfaces](./hosted-surfaces.md)
