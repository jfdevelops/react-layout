---
title: Final snapshot
description: How the last 0.x release is used, taken from its own README and changelog.
order: 20
---

This page describes the last `0.x` release, `0.25.0`. It is adapted from that tag's README, changelog and tests, and none of it was compiled. Earlier `0.x` releases differ, sometimes incompatibly. See the [overview](./index.md) for why.

In this guide you will:

- install the package
- define a layout with resources and `createProp`
- use render states and lazy loading
- bind resources once with `createDefinedResourceLayout`

## Install

```npm
npm i @jfdevelops/react-layout@0.25.0
```

```pnpm
pnpm add @jfdevelops/react-layout@0.25.0
```

```yarn
yarn add @jfdevelops/react-layout@0.25.0
```

```bun
bun add @jfdevelops/react-layout@0.25.0
```

React 18 or newer is a peer dependency (`react` and `react-dom` at `>=18`). Props are described with `createProp`, which the package exports.

## Define a layout

```tsx
import { createProp, defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceLayout, useResource } = defineResourceLayout({
  resources: ['users', 'settings'],
  options: {
    title: createProp.string(),
    description: createProp.string(),
  },
  layout: {
    composables: (create) => ({
      Layout: create({ name: 'PageLayout' }),
      Title: create({ name: 'PageTitle' }),
    }),
    props: {
      include: { title: true, description: true },
    },
    render: (props, { composables }) => (
      <composables.Layout>
        <ResourceBreadcrumb />
        <composables.Title>{props.title}</composables.Title>
        <p>{props.description}</p>
      </composables.Layout>
    ),
  },
});

function ResourceBreadcrumb() {
  const resource = useResource();

  return <span>{resource}</span>;
}

const UsersPage = createResourceLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
  description: 'Manage users.',
});
```

Created pages provide their current resource to descendants. Read it with the definition's typed `useResource` hook. It throws `MissingResourceProviderError` outside a page (added in 0.23.0). The returned `ResourceProvider` is available for manual boundaries.

## Render states

`render` can be an object. `default` is required and becomes the plain component. Every other key becomes a typed compound component with its own props and composables.

```tsx
const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: { title: createProp.string() },
  layout: {
    render: {
      default: {
        props: { include: { title: true } },
        render: ({ title }) => <h1>{title}</h1>,
      },
      Loading: () => <p>Loading users…</p>,
      NotFound: () => <p>Users not found.</p>,
    },
  },
});

const Users = createResourceLayout({ resource: 'users', name: 'Users', title: 'Users' });

<Users />;
<Users.Loading />;
```

## Bind resources once

At `0.25.0`, `createDefinedResourceLayout` is a chained builder: pass the resources, then `.defineOptions(...)`. It returns `composables`, `createRenderState` and a bound `defineResourceLayout`.

```tsx
const { composables, createRenderState, defineResourceLayout } =
  createDefinedResourceLayout('users').defineOptions({
    title: createProp.string(),
  });

export const pageComposables = composables((create) => ({
  Layout: create({ name: 'PageLayout' }),
}));

export const Loading = createRenderState({
  state: 'Loading',
  props: { include: { title: true } },
  render: ({ title }) => <p>Loading {title}…</p>,
});
```

The bound `defineResourceLayout` takes `{ layout: { render } }`. `createRenderState.defer(...)` makes a Suspense-deferred inline state, and `createRenderState.lazy(() => import('./audit.state'))` makes a code-split state. A lazy state module must have exactly one named export created by `createRenderState`.

## Lazy resources

```tsx
const { defineLazyDefaults, defineResourceLayout } = createDefinedResourceLayout('users');

defineLazyDefaults({
  Loading: GenericResourceLoading,
  Error: GenericResourceCodeError,
});

export const Users = defineResourceLayout.lazy({
  resource: 'users',
  load: () => import('./users.layout'),
});
```

Lazy modules use named exports and must export exactly one component created by the library. Nested resources use typed dot paths such as `admin.users.detail`. Lazy components preserve compound state access such as `<Users.NotFound />` and share one cached module load.

## Other features recorded in the changelog

| Feature                                                    | Added    |
| ---------------------------------------------------------- | -------- |
| `forResource` and `forResources` layout factories          | 0.3.0, 0.10.0 |
| Scoped components with `createComponent`, `asHOF`, `Root`  | 0.11.0 to 0.15.0 |
| `defineResourceLayout.withLayout` and `Shell`              | 0.21.0   |
| `forPaths`, `createGetComponent`, `getComponent` by path   | 0.18.0   |
| `createResourceLinks` and `withGroups`                     | 0.5.0 to 0.24.1 |
| The typed `ReactLayoutError` hierarchy                     | 0.18.0   |
| The `build-react-layouts` agent skill                      | 0.17.0   |

For how these behave, read the changelog entry for the release in question. Several changed in later `0.x` minors.

## Next steps

- [API reference for 0.25.0](./reference/api.md)
- [Migrating from v0 to v1](../v1/migration.md)
