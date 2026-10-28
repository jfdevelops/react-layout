# Lazy layouts, states, and scoped content

All lazy entry points accept a `load` callback and optional `fallback`. Each
loader imports once, shares its promise between `preload()` and rendering, and
exposes `status`: `unresolved`, `loading`, `resolved`, or `error`. Retry clears
the failed import and React's lazy cache so the next attempt imports again.

```tsx
const factory = createDefinedResourceLayout({
  resources: ['appointments', 'availability'],
});
const { defineLazyDefaults, defineResourceLayout, createRenderState } = factory;

const LazyError = defineLazyDefaults.createRenderState({
  state: 'Error',
  render: {
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
  },
});
defineLazyDefaults({
  Loading: defineLazyDefaults.createRenderState({
    state: 'Loading',
    render: ({ resource }) => <p>Loading {resource}…</p>,
  }),
  Error: LazyError,
});

export const Appointments = defineResourceLayout.lazy({
  resource: 'appointments',
  load: () => import('./appointments-layout'),
  fallback: <p>Downloading appointments…</p>,
});

// Route loaders and hover handlers can preload the same module rendering uses.
await Appointments.preload();

export const Audit = createRenderState.lazy({
  load: () => import('./audit-state'),
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

`defineLazyDefaults.createRenderState` accepts `state: 'Loading' | 'Error'`.
Loading callbacks receive the factory's resource path union. Error callbacks
also receive `error` and `retry`, or can use per-code handlers plus a `fallback`.
A missing handler without a fallback rethrows the error. Every callback receives
`{ composables }` as its second argument, including code handlers.

Declare included option/preset props and custom schemas the same way as layout
render states. Lazy defaults have no separate create-time configuration call,
so shorthand includes (`true` and `'optional'`) accept values on the returned
component; option-definition defaults still apply. Explicit include objects
preserve `suppliedVia`: `'config'` reads factory option defaults and excludes
that prop from the component signature, while `'component'` accepts caller
values. Config-only includes ignore component overrides. Props are validated
on every render.

```tsx
const ErrorCard = defineLazyDefaults.createRenderState({
  state: 'Error',
  props: {
    include: { title: true }, // title is declared in the factory's options
    custom: { showReload: createProp.boolean().optional() },
  },
  render: ({ title, resource, error, retry, showReload }, { composables }) => (
    <composables.Layout>
      <h2>{title}</h2>
      <p>{resource}: {error.message}</p>
      {showReload && <button onClick={retry}>Retry</button>}
    </composables.Layout>
  ),
});

defineLazyDefaults({
  Error: (props) => <ErrorCard {...props} title="Could not load this page" showReload />,
});
```

`createErrorComponent` remains supported as a deprecated alias for
`createRenderState({ state: 'Error', render })`, including its generic custom
props and handler-map forms. It now wraps the callback to provide composables;
it no longer returns the original callback by identity. Migrate custom props to
`props.custom` to get runtime validation. The alias is retained for a minor
release and scheduled for removal in the next major.

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

const CalendarPage = scope.createComponent({
  resources: { appointments },
  render: (_, ctx) => <ctx.Appointments />,
});
export const AppointmentsPage = CalendarPage.asHOF()('appointments');
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

## Composable parts on bound pages

When the layout defines composables, a page returned by `asHOF()` also exposes
`makeComposable`. Its resource is already bound; pass only the optional name:

```tsx
const AvailabilityPage = CalendarPage.asHOF()('availability');
const AvailabilityDetailPage = AvailabilityPage.makeComposable({
  name: 'AvailabilityDetailPage',
});

<AvailabilityDetailPage>
  <AvailabilityDetailPage.Header>Availability</AvailabilityDetailPage.Header>
  <AvailabilityDetailPage.Content>Details</AvailabilityDetailPage.Content>
</AvailabilityDetailPage>;
```

The returned parts are the same ones exposed by a resource layout's
`makeComposable`. Omit the name (or call without arguments) to use the name
configured by `forResources`. Rebinding the same resource returns the same
component and helper. Without composables, the helper is `undefined` in both
runtime and public types. `makeComposable` is reserved as a scoped component
name.
