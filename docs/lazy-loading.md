# Lazy layouts, states, and scoped content

All lazy entry points accept a `load` callback and optional `fallback`. Each
loader imports once, shares its promise between `preload()` and rendering, and
exposes `status`: `unresolved`, `loading`, `resolved`, or `error`. Retry clears
the failed import and React's lazy cache so the next attempt imports again.

```tsx
const factory = createDefinedResourceLayout({
  resources: ["appointments", "availability"],
});
const { defineLazyDefaults, defineResourceLayout, createRenderState } = factory;

const LazyError = defineLazyDefaults.createErrorComponent({
  resourceModuleLoad: ({ resource, error, retry }) => (
    <div role="alert">
      <p>
        {resource}: {error.message}
      </p>
      <button onClick={retry}>Retry</button>
    </div>
  ),
  lazyResourceStateNotFound: ({ error }) => <p>Missing state: {error.state}</p>,
  fallback: ({ error }) => <p>{error.message}</p>,
});
defineLazyDefaults({
  Loading: ({ resource }) => <p>Loading {resource}…</p>,
  Error: LazyError,
});

export const Appointments = defineResourceLayout.lazy({
  resource: "appointments",
  load: () => import("./appointments-layout"),
  fallback: <p>Downloading appointments…</p>,
});

// Route loaders and hover handlers can preload the same module rendering uses.
await Appointments.preload();

export const Audit = createRenderState.lazy({
  load: () => import("./audit-state"),
  fallback: <p>Downloading audit…</p>,
});
// The existing createRenderState.lazy(() => import('./audit-state')) also works.
```

Declare lazy defaults once, before creating lazy resources or states. Lazy
resource modules export exactly one created resource layout (a namespace with
`Root` is supported). Lazy state modules export exactly one state created with
`createRenderState`. Missing or ambiguous exports produce
`LazyResourceModuleShapeError`, with `resource` identifying the entry and
`received` containing the number of matching exports.

Loading UI uses an explicit `fallback` first (including `null`), then the
layout's `Loading` state where available, then the factory's lazy `Loading`
default, then `null`. Resource-level `states` can override the factory defaults.

## Typed errors

`Error` receives `{ error, retry, resource }`. Its `error` is the closed
`LazyResourceError` union, narrowed by `error.code`:

| Code                        | Extra fields           |
| --------------------------- | ---------------------- |
| `resourceModuleLoad`        | `resource`, `cause`    |
| `lazyResourceModuleShape`   | `resource`, `received` |
| `lazyResourceStateNotFound` | `resource`, `state`    |

Import failures include their cause's name and message. Development builds
also log the original cause once per import attempt. Shape and missing-state
errors extend `LayoutConfigurationError` for existing `instanceof` checks.

Use `typeof defineLazyDefaults.errors` for the union without importing a type.
The property is non-enumerable and `undefined` at runtime. Use
`LazyResourceErrorMap` when a lookup by code is useful.

`createErrorComponent` accepts a render function or an object containing
optional per-code handlers. Handlers receive the narrowed error type. A
`fallback` handles omitted codes; without either a handler or fallback, the
error is rethrown. The function form returns the original component reference.
The helper can be called before registering defaults and accepts custom props:

```tsx
const ErrorCard = defineLazyDefaults.createErrorComponent<{ title: string }>(
  ({ title, resource, error, retry }) => (
    <section>
      <h2>{title}</h2>
      <p>
        {resource}: {error.message}
      </p>
      <button onClick={retry}>Retry</button>
    </section>
  ),
);

defineLazyDefaults({
  Error: (props) => <ErrorCard {...props} title="Could not load this page" />,
});
```

**Migration:** lazy `Error` components handle lazy failures only. Put an error
boundary around the route to handle ordinary page render exceptions. Compound
state access through a lazy resource proxy requires capitalized names, such as
`Page.Loading` and `Page.NotFound`. React statics and Promise methods return
`undefined`; awaiting a lazy component no longer treats it as a thenable.

## Lazy scoped shells

Keep the shell and its prop declarations separate from content that imports
the shell. Both resource content and each nested component accept `lazy` in
place of `render`. The two are mutually exclusive. Pass an import callback or
`{ load, fallback }`; a definition-level `fallback` takes precedence.

```tsx
const { createResourceLayout } = defineResourceLayout({
  render: () => <main />,
});
const scope = createResourceLayout.forResources("appointments", "availability");

const appointments = scope.createResourceComponents({
  resource: "appointments",
  components: {
    Grid: { lazy: () => import("./appointments-grid") },
    Calendar: {
      lazy: {
        load: () => import("./appointments-calendar"),
        fallback: <p>Loading calendar…</p>,
      },
    },
  },
  lazy: () => import("./appointments-content"),
});

const CalendarPage = scope.createComponent({
  resources: { appointments },
  render: (_, ctx) => <ctx.Appointments />,
});
export const AppointmentsPage = CalendarPage.asHOF()("appointments");
```

The imported scoped module exports exactly one render function, React
component, or created render state. Render functions receive the shell props
and sibling component context. You can export a callback checked with
`satisfies ScopedComponentRenderFn<Props, Context>`. Declare props on the shell
so call sites retain their types before the content module has loaded.

`ctx.Appointments.Grid.preload()` imports one nested entry. Preloading a
resource entry, a bound page, or the outer scoped component imports all of its
lazy content. Their `status` summarizes those entries, prioritizing error,
loading, and unresolved before resolved. `createComponent` itself also accepts
`lazy` in place of its top-level `render`.

Every lazy declaration appears in devtools before loading. Its node reports
loading, resolution, or failure, tracks mounted loading and error UI, and
shows a serialized cause chain and stack traces when selected. The header
counts lazy declarations even when no loaded layout has registered yet.
