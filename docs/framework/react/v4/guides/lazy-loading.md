---
title: Lazy loading
description: Code-split whole pages, single states and scoped content, with typed errors, retry and preloading.
order: 60
---

Lazy entry points split your bundle by loading a module the first time it is needed. Every one takes a `load` callback and an optional `fallback`, shares one cached import, and reports a `status`.

In this guide you will:

- load a whole page lazily and preload it from a route
- set shared `Loading` and `Error` defaults
- handle typed lazy errors and retry
- split a scoped shell from its content

## Load a page lazily

Declare defaults once, then create lazy pages from your defined layout.

```tsx
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { defineLazyDefaults, defineResourceLayout } =
  createDefinedResourceLayout({
    resources: ['appointments', 'availability'],
  });

defineLazyDefaults({
  Loading: ({ resource }) => <p>Loading {resource}…</p>,
  Error: ({ error, retry }) => (
    <div role='alert'>
      <p>{error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  ),
});

export const Appointments = defineResourceLayout.lazy({
  resource: 'appointments',
  load: () => import('./appointments-layout'),
  fallback: <p>Downloading appointments…</p>,
});

export function preloadAppointments() {
  return Appointments.preload();
}
```

The loaded module uses named exports and must export **exactly one** component created by the library (a namespace with `Root` is allowed). Nested resources use typed dot paths such as `admin.users.detail`, and compound states such as `<Appointments.NotFound />` keep working.

Rules to remember:

- `status` is `unresolved`, `loading`, `resolved` or `error`.
- `preload()` imports the same module rendering uses, so call it from a route loader or hover handler.
- Once loaded, new members render synchronously. A router that swaps `<Page.Loading />` for `<Page />` does not flash the loading fallback again.
- Retry clears the module and member caches so the next attempt imports again.
- Declare lazy defaults **before** creating lazy resources or states.

> **Tip:** Fallback precedence is an explicit `fallback` (including `null`), then the layout's `Loading` state, then the factory's lazy `Loading` default, then `null`. Resource-level `states` can override the factory defaults.

## Lazy states

`createRenderState.lazy(() => import('./audit-state'))` creates a real code-split state, and `createRenderState.lazy({ load, fallback })` adds a fallback. The module must have exactly one named export created by `createRenderState`. A missing or ambiguous export throws `LazyResourceModuleShapeError`, whose `resource` names the entry and whose `received` is the number of matching exports.

## Typed lazy errors

A lazy `Error` receives `{ error, retry, resource }`. `error` is the closed `LazyResourceError` union, narrowed by `error.code`.

| Code                        | Extra fields           |
| --------------------------- | ---------------------- |
| `resourceModuleLoad`        | `resource`, `cause`    |
| `lazyResourceModuleShape`   | `resource`, `received` |
| `lazyResourceStateNotFound` | `resource`, `state`    |

Import failures include the cause's name and message, and development builds log the original cause once per attempt. Shape and missing-state errors extend `LayoutConfigurationError`. Use `typeof defineLazyDefaults.errors` for the union without importing a type (it is `undefined` at runtime). `LazyResourceErrorMap` helps when you look errors up by code.

`defineLazyDefaults.createRenderState` accepts `state: 'Loading' | 'Error'`. An `Error` render can be a single callback, or an object of per-code handlers plus a `fallback`. A code with no handler and no fallback rethrows. You can declare `props.include` and `props.custom` on these states as on any render state.

> **Warning:** Lazy `Error` components handle lazy failures only. Wrap the route in an error boundary for ordinary render exceptions.

## Lazy scoped shells

Keep a shell and its prop declarations separate from content that imports the shell, to avoid circular imports. Resource content and each nested component accept `lazy` instead of `render`; the two are mutually exclusive. Pass an import callback or `{ load, fallback }`. A definition-level `fallback` wins.

```tsx
const scope = createResourceLayout.forResources('appointments', 'availability');

const appointments = scope.createResourceComponents({
  resource: 'appointments',
  components: {
    Grid: { lazy: () => import('./appointments-grid') },
    Calendar: {
      lazy: {
        load: () => import('./appointments-calendar'),
        fallback: <p>Loading calendar…</p>,
      },
    },
  },
  lazy: () => import('./appointments-content'),
});
```

The imported scoped module exports exactly one render function, React component or created render state. Declare props on the shell so call sites keep their types before the content loads. `ctx.Appointments.Grid.preload()` imports one nested entry, and preloading a resource entry, bound page or the outer component imports all its lazy content. `createComponent` also accepts `lazy` in place of its top-level `render`.

## Compound states on a lazy proxy

Compound state access through a lazy resource proxy needs capitalized names such as `Page.Loading`. React statics and Promise methods return `undefined`, and awaiting a lazy component does not treat it as a thenable.

## Next steps

- [Render states](./render-states.md)
- [Develop and debug](./develop-and-debug.md): lazy declarations appear in the inspector before they load.
- [Troubleshooting](./troubleshooting.md#lazy-loading)
