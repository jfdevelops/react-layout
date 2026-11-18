---
title: Resources and layouts
description: Declare resources and options, create typed pages, name them, and mount a persistent shell.
order: 30
---

In this guide you will:

- declare resources and create typed pages
- name pages and choose a component shape
- mount a persistent shell and build navigation links

A React Layout definition is built from three things: the **resources** your
app has, the **options** a page can supply when it is created, and a **layout**
that renders them. This guide covers resources, creating pages, naming, namespaces,
the resource accessor, a persistent shell and navigation links.

## Declare resources

A resource is a string. A resource with children is an object with `value` and
`subResources`. Sub-resources nest to any depth, and you address them with
dot-delimited paths.

```ts
const resources = [
  'dashboard',
  {
    value: 'users',
    subResources: [
      'admins',
      {
        value: 'managers',
        subResources: ['female', 'male'],
      },
    ],
  },
];
```

The paths above are `users`, `users.admins`, `users.managers`,
`users.managers.female` and so on.

Call `defineResourceLayout.defineResources(...)` when you want a strongly typed
resources array without writing `as const`.

## Create pages

`createResourceLayout` takes the resource, a `name`, and any option values the
layout needs. It returns a React component.

```tsx
const UsersPage = createResourceLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
});
```

When no required option remains, the options argument can be omitted from a
bound builder. Create several pages from one resource subset with
`createResourceLayout.forResources('users', 'admins')`, or one with
`createResourceLayout.forResource({ resource: 'users' })`. Resources outside the
subset are compile errors.

`resource` is checked against your declaration, so `resource: 'user'` fails type
checking. Every created page also provides its resource to descendants through
`useResource()`.

## Options and the layout contract

`options` is a map of prop definitions, each validated on its own. In v1 the
definitions come from `createProp`. See [Props and validation](./props-and-validation.md).

`layout.props.include` selects which options the render callback receives and
where their values are supplied:

- `true`: required, supplied when the page is created.
- `'optional'`: optional, accepted when the page is created or on the component.
- `{ required, suppliedVia }`: explicit (added in 1.5.0). `required` is `true` or
  `false`. `suppliedVia` is `'component'` or `'config'`. The older `visibility` and
  `passthrough` spellings are deprecated aliases in v1, accepted alongside the new
  names (the new names win if both appear) and removed in v2.

`createDefinedResourceLayout` accepts the same `props: { include, custom }`
contract as a layout, so you can set a contract once for a whole product area.
Merge precedence is **factory, then layout, then state**. Each `include` or
`custom` key merges independently, and the closer declaration replaces the entire
entry for that key. These are contracts, not default data values.

## Naming

A creation-time `name` is a string or a callback. A callback receives the literal
`resource`, the declared state names in `states`, and a literal-preserving
`capitalize` function.

```tsx
createResourceLayout({
  resource: 'users',
  name: ({ resource, capitalize }) => `${capitalize(resource)}Page`,
});
```

If no `name` is given and no default exists, resource `'users'` generates
`'UsersLayout'` at runtime and as an exact TypeScript literal. An explicit
component name overrides the definition default, which overrides the factory
default, which overrides that generated name.

Use `defineLayoutName` to share a convention. It takes one configuration object
with a `pattern` and an optional `strict` flag. The `prefix`, `beforeSuffix` and
`append` slots go wherever your pattern places them:

```tsx
import {
  createDefinedResourceLayout,
  defineLayoutName,
} from '@jfdevelops/react-layout';

const pageName = defineLayoutName({
  pattern: ({ resource, capitalize }, parts) =>
    `${parts.prefix}${capitalize(resource)}${parts.beforeSuffix}ResourceLayout${parts.append}`,
});

const layouts = createDefinedResourceLayout({
  resources: ['users', 'settings'],
  name: pageName(),
});
const definition = layouts.defineResourceLayout({
  render: () => <div />,
});

export const Users = definition.createResourceLayout({
  resource: 'users',
});

export const Settings = definition.createResourceLayout({
  resource: 'settings',
  name: pageName({
    prefix: 'Admin',
    beforeSuffix: 'Detail',
    append: 'Preview',
  }),
});
```

`Users.displayName` is `"UsersResourceLayout"`; `Settings.displayName` is
`"AdminSettingsDetailResourceLayoutPreview"`.

Declare your own string or number slots with `defineLayoutName.defineParts(...)`
and finish with `.namingFn({ pattern })`. Parts are validated at runtime without
coercion: an unknown key throws `InvalidPartError` and a wrong kind throws
`InvalidPartTypeError`. Both extend `ReactLayoutError`. Set `strict: false` to turn
off both the type constraints and the runtime checks; unchecked names are typed
as `string`.

Defaults apply in this order: **factory, definition, creation call**. Naming
resolves when components are created, so it does not change with mounted state.

## Component namespaces

By default `createResourceLayout` returns a callable component with state components
attached. Set `namespace: true` to return a plain object instead, so editor
completion on `Users.` suggests only `Root` and the named states.

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';

const definition = defineResourceLayout({
  resources: ['users'],
  namespace: true,
  layout: {
    render: {
      default: () => <p>Users</p>,
      Loading: () => <p>Loading users</p>,
    },
  },
});

const Users = definition.createResourceLayout({
  resource: 'users',
  name: 'Users',
});

export const Callable = definition.createResourceLayout({
  resource: 'users',
  name: 'Callable',
  namespace: false,
});

export function Screen() {
  return (
    <>
      <Users.Root />
      <Users.Loading />
      <Callable />
    </>
  );
}
```

The closest setting wins: shared factory, then definition, then component
creation. Omitting `namespace` everywhere means `false`. In namespace mode,
component metadata and `makeComposable` stay on `Root`, and `Root` is reserved as a
state name only when namespace mode is on.

## The resource accessor

A definition returns a `resources` accessor, and render callbacks receive the same
accessor as `context.resources`.

| Member                          | What it gives you                                                        |
| ------------------------------- | ------------------------------------------------------------------------ |
| `resources()`                   | Normalized definitions. `resources.raw()` returns the original input.    |
| `resources.current`             | The resource of the page being rendered.                                 |
| `resources.pick(...keys)`       | A selection of the named resources. Requires at least one key.           |
| `resources.omit(...keys)`       | A selection of every resource except those named. At least one key.      |
| `resources.isResource(value)`   | Narrows an unknown value to a resource key.                              |

`pick` and `omit` return a selection thunk: call it to get the definitions, or use
its own `isResource` guard to narrow against just that selection.

## A persistent shell

`defineResourceLayout.withLayout` adds a `Shell` component that you mount once
around your router outlet. It renders the `shell` block and stays mounted across
navigation, so a sidebar keeps its state while pages mount and unmount inside it.

```tsx
import { createProp, defineResourceLayout } from '@jfdevelops/react-layout';

const { Shell, createResourceLayout, createResourceLinks } =
  defineResourceLayout.withLayout({
    resources: ['users', 'posts'],
    options: {
      title: createProp.string().optional(),
    },
    shell: {
      render: (_props, { resources, children }) => (
        <div>
          <nav>{resources.current ?? 'home'}</nav>
          <main>{children}</main>
        </div>
      ),
    },
  });

export const UsersPage = createResourceLayout.forResource({
  resource: 'users',
  name: 'UsersPage',
})();

export const links = createResourceLinks({
  users: {
    label: 'Users',
    href: (resource) => `/${resource}`,
  },
  posts: {
    label: 'Posts',
  },
});

export function App() {
  return (
    <Shell>
      <UsersPage />
    </Shell>
  );
}
```

`shell` mirrors the `layout` block (`props`, `composables`, `render`). Pages
report their resource to an ancestor `Shell`, so `resources.current` is typed as
possibly `undefined` there. Shell composables keep a stable identity across
navigation. Reports are scoped to the owning definition, so a page from a
different definition rendered in the outlet cannot change `resources.current`.
`Shell` accepts an optional `resource` prop that overrides the reported value,
which is useful in tests and stories. Under `withLayout`, a per-resource
`layout.render` is optional: omit it and the page renders its own `children`
into the outlet, as the example does. `withLayout` accepts a default `name` convention like
`defineResourceLayout` does.

## Navigation links

`createResourceLinks` builds navigation entries from resource keys. It returns
the `href` split into `given` (what you wrote) and `full` (with the `#resource`
anchor), the `label`, the `resource` and an `icon` (`null` when you give none).
`href` may be a string or a function of the resource. Config entries must be
objects with a string `label`, and invalid shapes throw with a message naming the
resource. `createResourceLinks.withGroups` groups links; group ids derive
deterministically from the label and link keys, so it is safe to call at module
scope on runtimes that forbid random values there.

## Next steps

- [Props and validation](./props-and-validation.md)
- [Render states](./render-states.md)
- [Route components and renderers](./route-components.md)
