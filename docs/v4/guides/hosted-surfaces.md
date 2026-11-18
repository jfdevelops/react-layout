---
title: Hosted surfaces
description: Attach panes, drawers and overlays to a host resource with their own resources, props and chrome.
order: 100
---

A hosted surface is a family of layouts that has its own resources, props and
chrome but belongs to a host resource: a create/detail pane over `users`, or a
settings overlay available from any page. It differs from a sub-resource, which is
hierarchy inside one chrome.

In this guide you will:

- define a hosted family from a defined layout
- create hosted pages with `hostedBy`
- declare everything in one call with `defineResourceSurfaces`

## Define a hosted family

`createDefinedResourceLayout` returns `defineResourceSurface`. Pass the surface's
own `resources` and a `host` naming which host resources it can attach to.

```tsx example=v4/hosted-surfaces.tsx
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const admin = createDefinedResourceLayout({
  resources: ['users', 'teams'],
});
const panes = admin.defineResourceSurface({
  resources: ['create', 'detail'],
  host: {
    resources: ['users'],
  },
});
const paneLayout = panes.defineResourceLayout({
  render: () => <aside />,
});

export const UserCreatePane = paneLayout.createResourceLayout.forResource({
  resource: 'create',
  hostedBy: 'users',
})();
```

Every surface uses the same slots: `resources`, `host`, and the usual `options`,
`composables`, `props`, `render` and `shell`. A pane mode is a resource of the
pane surface. Overlay behavior comes from declaring `host` and omitting a
persistent `shell`.

## Rules for `hostedBy`

- A hosted factory requires `hostedBy` for direct creation and for binding through
  `forResource` or `forResources`.
- `hostedBy` must be one of the surface's `host.resources`. With
  `host: { resources: '*' }` any root resource is allowed.
- Omitting `host` creates an independent family.
- Root factories keep their existing API and reject `hostedBy`.
- Host resources are checked at runtime as well as by types.

```tsx
paneLayout.createResourceLayout({
  resource: 'create',
  hostedBy: 'users',
  title: 'Add user',
});
```

## Declare everything in one call

`defineResourceSurfaces` suits smaller apps. Give each surface a string key; a
hosted entry names its host with `host: { surface, resources }`.

```tsx example=v4/hosted-surfaces-one-call.tsx
import { defineResourceSurfaces } from '@jfdevelops/react-layout';

export const surfaces = defineResourceSurfaces({
  page: {
    resources: ['users', 'teams'],
    render: () => <main />,
  },
  pane: {
    resources: ['create', 'detail'],
    host: {
      surface: 'page',
      resources: '*',
    },
    render: () => <aside />,
  },
});
```

It returns one completed layout per key. Each entry supports `options`,
`composables`, `props` and `render`, and an optional `shell` that uses the same
persistent `withLayout` implementation. You can also pass already-completed
layouts to register them without changing their types or identity.

| Style         | Entry point                                              | How the host is named              |
| ------------- | -------------------------------------------------------- | ---------------------------------- |
| One call      | `defineResourceSurfaces`                                 | `host.surface: 'page'` string key  |
| Several files | `createDefinedResourceLayout` then `defineResourceSurface` | Implicit, through the returned helper |
| Feature code  | `forResource` or `createResourceLayout`                  | The conditional `hostedBy` option  |

In several files, the host is the defined layout that provided
`defineResourceSurface`, so a `surface` name is unnecessary.

## What is not covered

Hosted surfaces do not replace `withLayout` or `Shell`, do not fold panes into the
page renderer with flags, and do not model sign-in as a surface of your admin. They
also do not validate router search params.

For the original design rationale, see the repository's maintainer design notes
in `docs/maintainers/design/hosted-surfaces.md`.

## Next steps

- [Resources and layouts](./resource-layouts.md#a-persistent-shell)
- [Route components and renderers](./route-components.md)
