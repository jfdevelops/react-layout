---
title: Route components and renderers
description: Describe the components for each route once, look them up by path, and share one renderer across routes.
order: 50
---

Routers usually want a component per route and per route state: the page, its error view, its pending view. A resource config stores those components by resource, and a **renderer** turns a path selection into whatever your router expects.

In this guide you will:

- build a resource config
- look components up by resource or by path
- create a shared renderer with parameters and a factory
- bind scoped components to one resource

## Build a resource config

`createResourceConfig` comes from your definition. Key it by resource and give each entry component slots.

| Slot                | Holds                                         |
| ------------------- | --------------------------------------------- |
| `component`         | The page.                                     |
| `errorComponent`    | The error view.                               |
| `pendingComponent`  | The pending view.                             |
| `notFoundComponent` | The not-found view.                           |
| `detail`, `new`     | A shared branch with its own set of slots.    |
| other keys          | Sub-resources, keyed directly on their parent |

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceConfig } = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins'],
    },
    'groups',
  ],
  layout: {
    render: () => <main />,
  },
});

const config = createResourceConfig({
  users: {
    component: <p>Users</p>,
    errorComponent: <p>Users failed</p>,
    detail: {
      component: <p>User detail</p>,
    },
    admins: {
      component: <p>Admins</p>,
    },
  },
  groups: {
    component: <p>Groups</p>,
  },
});

export const usersPage = config.getComponent({
  resource: 'users',
});

export const adminsPage = config.getComponent({
  resource: 'users',
  subResource: 'admins',
});

export const getDetail = config.createGetComponent(
  '$resource.detail.$component',
);

export const detail = getDetail({
  resource: 'users',
  component: 'component',
});
```

Resource configs can be assembled across files. `createResourceConfig.forResource('users', { component: <Users /> })` returns a fragment you spread into the final config, and the fragment keeps its resource-specific types.

## Look components up

- `config.getComponent(options)` resolves one component. Nest `subResource` as `{ value, subResource }` for deeper levels. It also accepts a deep path.
- `config.createGetComponent(path)` returns a getter for a path pattern. `$resource`, `$subResource` and `$component` are variables, and a fixed segment narrows the allowed resources to those that configure it. A path with no variables, such as `'users.detail.component'`, returns the getter's result when called with no arguments.
- `config.forPaths(...)` is a builder with `addParams`, `render`, `setDisplayName` and `asHOF`. `addPathParams` and `addComponentKeyParams` still work but are deprecated; see [Migration](./migration.md).
- A slot that is not configured on the resolved node returns `null`.
- Invalid lookups throw typed errors: `InvalidPathError`, `InvalidResourceError`, `InvalidSubResourceError`, `InvalidComponentError`, `MissingPathVariableError` and `InvalidConfigError`. All extend `ReactLayoutError`.

## Share a renderer

`createRenderer` defines how a selected path becomes a value. Only `render` is required. Without a `factory`, selecting a path returns a configured Component. With a `factory`, it returns a function that takes the parameters you declared.

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceConfig } = defineResourceLayout({
  resources: ['trash'],
  layout: {
    render: () => <main />,
  },
});

const pages = createResourceConfig({
  trash: {
    component: <p>Trash</p>,
    pendingComponent: <p>Loading trash…</p>,
  },
});

const renderPage = pages.createRenderer({
  params: {
    include: {
      keys: true,
    },
  },
  render: ({ getComponentForPath, path, params }) => {
    const getComponents = getComponentForPath(path);
    const components = getComponents();

    return components[params.componentKey];
  },
  displayName: ({ path, params }) => `${path}Page${params.componentKey}`,
  factory: {
    render:
      (_props, { context: { Component, componentKey } }) =>
      () => <Component componentKey={componentKey} />,
  },
});

const renderTrash = renderPage('trash');

export const routeOptions = {
  component: renderTrash({
    component: 'component',
  }),
  pendingComponent: renderTrash({
    component: 'pendingComponent',
  }),
};
```

### Call a factory

A factory takes **one options object**: `selectedFactory({ component, params, props })`.

| Field       | Meaning                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `component` | A configured component key, or `'*'` to return every configured component's result keyed by its key. |
| `params`    | Path variables and custom parameters. It does not accept `componentKey`.                             |
| `props`     | Factory props, validated by `factory.props`.                                                         |

Each field is optional when its inputs are optional or defaulted, and the whole object can be omitted when nothing is required. Required `factory.props` inputs make the `props` field required:

```tsx
const renderTrash = renderPage('trash');
const page = renderTrash({
  params: { title: 'Trash' },
  props: { label: 'Page' },
});
```

The factory's first callback argument holds the validated factory props. The second argument's `context` holds the configured Component and every validated declared parameter. Factory results keep their inferred type and runtime identity: thunks, JSX, primitives and objects all work.

### Configure parameters

`createRenderer.params` and `forPaths(...).addParams(...)` accept `include` and `custom`. Every property is optional.

| Setting                          | Effect                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `include.path: true`             | Include every path variable as a required parameter.                                         |
| `include.path: { pick, optional }` | Select values from the resource tree (`true` for a branch, nested objects for children) and optionally make them optional. |
| `include.keys: true`             | Include the required `componentKey`.                                                         |
| `custom`                         | A map of synchronous Standard Schemas. Callers pass inputs; callbacks receive outputs.       |

Custom names cannot shadow included parameters or the reserved names `Component`, `children`, `context`, `path`, `params` and `getComponentForPath`. Collisions are rejected at definition time and by the type system.

### Select and override

- A direct call selects a page when the node has a component slot. For a parent-only node, `renderPage('containers')('$containerId')` equals `renderPage('containers.$containerId')`.
- When a node is both a page and a parent, the page wins. Use `renderPage.forPath('containers')('$containerId')` to scope explicitly. `forPath` always returns a scope; `scope.build()` resolves it.
- Selections with descendants expose `forResource(relativePath)`. The argument is relative to the selection, completes one segment at a time, and keeps the renderer, factory and overrides. Leaf selections omit it.

```tsx
const renderUsers = renderPage('users');
const renderUserDetail = renderUsers.forResource('detail');
// Equivalent to renderPage('users.detail').
```

- `renderPage.render(callback)` and `scope.render(callback)` create a separate render override before factory evaluation. Overrides are immutable.
- Descendant selection on a Component returned by a factory stays component-only and does not run the factory again.

### Name the result

`displayName` accepts a string, a callback, or a path mapping. Each mapping entry accepts the same string or callback form. Parent entries match descendants; the most specific matching key wins. `'*'` handles unmatched paths. Without it, unmatched paths retain the default name.

```tsx
displayName: {
  containers: ({ path }) =>
    path.create(path.segments.containers.capitalize(), 'Page'),
  'containers.overview': ({ path }) =>
    path.create(
      path.segments.containers.capitalize(),
      path.segments.overview.capitalize(),
      'Page',
    ),
  'containers.create': 'CreateContainersPage',
  '*': ({ path, params, capitalize }) =>
    path.create(path.capitalize(), capitalize(params.componentKey)),
}
```

Callbacks receive the existing display-name context, with the path narrowed to the mapping entry's matching paths. `path.segments` exposes individual segment names as path objects with the same helpers. Use `path.is()` to narrow before accessing a segment that exists only on a descendant. Repeated segment names share one property. `path.create(...parts)` concatenates string parts and preserves literal and union types without `as const`; its result is always a string.

Both the callback and object mapping forms support joined capitalization. The shorthand preserves path order. Both flags default to `false`, so an empty join object behaves like `path.capitalize()`.

```tsx
displayName: ({ path }) => {
  if (path.is('containers.overview')) {
    return path.capitalize({
      join: { removeDelimiter: true, capitalizeSegments: true },
    });
  }

  return path.capitalize();
}
```

For custom order or a suffix, use a join callback. It receives typed segment path objects, the shared `capitalize` helper, and literal-preserving `create`:

```tsx
path.capitalize({
  join: ({ segments, create }) =>
    create(
      segments.overview.capitalize(),
      segments.containers.capitalize(),
      'Page',
    ),
});
```

The callback's string is returned unchanged. Both forms preserve literal and union return types without `as const`.

The `displayName` callback receives a typed `path` object.

| Member                     | Result                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `path.value`               | The path string.                                                                              |
| `path.is(prefix)`          | Matches the exact path and dot-separated descendants, narrowing `path.value`.                 |
| `path.capitalize()`        | Capitalizes the current path.                                                                 |
| `path.capitalize('a.b')`   | Capitalizes that literal path: `'A.b'`.                                                       |
| `path.capitalize('*')`     | Current path capitalized, typed as the union of all capitalized valid paths.                  |

Template interpolation and `path.toString()` still give the original string.

## Scoped components

`forResources(...).createComponent` makes one component that serves several resources. `asHOF()` binds a resource once.

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

- `context.Root` is the layout for the current resource, built from that entry's options. Rendering it needs an entry for the current resource.
- Each entry can register `components`, available as `context.Users.Toolbar` and as statics on the bound component.
- `asHOF()('users')` removes `resource` from the props. Binding is cached, so rebinding during render never remounts the subtree.
- When the layout defines composables, a bound page also exposes `makeComposable({ name })`, with its resource already bound.
- Reserved scoped component names are `makeComposable`, `state`, and the component object's own statics such as `props`, `resource` and `displayName`, plus `Function.prototype` members such as `name` and `call`. A resource whose capitalized name is `Root` is rejected because `Root` is the layout key.

## Next steps

- [Lazy loading](./lazy-loading.md) for lazy scoped content
- [Hosted surfaces](./hosted-surfaces.md)
- [Migration from v3](./migration.md) for the renderer's new options object
