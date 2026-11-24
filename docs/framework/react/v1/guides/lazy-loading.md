---
title: Lazy loading
description: Code-split whole pages or single render states with shared Loading and Error defaults.
order: 90
---

Lazy entry points split your bundle by loading a module the first time it is needed. In v1 there are two: whole resource layouts and single render states. The richer loader API (`preload()`, `status`, typed errors, lazy scoped content) arrived in 2.0.0.

In this guide you will:

- load a whole page lazily
- set shared `Loading` and `Error` defaults
- load a single render state lazily

## Load a page lazily

Declare defaults once, then create lazy pages from your defined layout.

```tsx
const { defineLazyDefaults, defineResourceLayout, resources } =
  createDefinedResourceLayout({ resources: ['users'] });

defineLazyDefaults({
  Loading: GenericResourceLoading,
  Error: GenericResourceCodeError,
});

export const Users = defineResourceLayout.lazy({
  resource: 'users',
  load: () => import('./users.layout'),
});
```

The loaded module uses named exports and must export exactly one component created by the library. Nested resources use typed dot paths such as `admin.users.detail`. Lazy components preserve compound state access such as `<Users.NotFound />` and share one cached module load. Loading and error defaults are retryable (added in 0.25.0).

## Load a render state lazily

`createRenderState.lazy(() => import('./audit.state'))` creates a real code-split state. The module must have exactly one named export created by `createRenderState`. `createRenderState.defer(...)` makes a Suspense-deferred inline state in the same file.

## Behaviors that changed in v2

Plan for these if you upgrade:

- In v1 a lazy `Error` component also handled ordinary page render errors. In v2 it handles only lazy failures, and render errors go to your route's error boundary.
- In v1 compound states on a lazy proxy could be synthesized from lowercase names. In v2 they must start with a capital letter.

## Next steps

- [Render states](./render-states.md)
- [Migrating to v2](../../v2/migration.md)
