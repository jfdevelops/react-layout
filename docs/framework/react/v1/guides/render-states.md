---
title: Render states
description: Add Loading, Error, NotFound and custom states to a page, reuse them as composables, and derive new states.
order: 50
---

A render state is a named variant of a page. A page always has a `default` state. Any other key you add becomes a typed component attached to the page, such as `<Users.Loading />`.

In this guide you will:

- declare states inline and as separate building blocks
- reuse one state inside another
- derive a state from an existing one

## Declare states inline

Set `layout.render` to an object. `default` is required and becomes the plain component. Every other key gets its own props and composables.

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
      Error: {
        props: {
          custom: {
            error: createProp.object({ message: createProp.string() }),
          },
        },
        render: ({ error }) => <p>{error.message}</p>,
      },
      NotFound: () => <p>Users not found.</p>,
    },
  },
});

const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
});

<Users />;
<Users.Loading />;
<Users.NotFound />;
```

The editor suggests `default`, `Loading`, `Error` and `NotFound`, and you can add your own (1.0.1 and 1.1.0). Each state keeps its props separate from the default component's.

## Declare states as building blocks

`createDefinedResourceLayout` returns `createRenderState`. Write each state in its own file and combine them with object spread.

```tsx
export const Loading = createRenderState({
  state: 'Loading',
  props: { include: { title: true } },
  render: ({ title }) => <p>Loading {title}…</p>,
});

defineResourceLayout({ render: { default: Page, ...Loading } });
```

Two variants load work later:

- `createRenderState.defer(...)` makes a Suspense-deferred inline state.
- `createRenderState.lazy(() => import('./audit.state'))` makes a real code-split state. The module must have exactly one named export created by `createRenderState`.

Render callbacks receive their state's props first and a context second. The context holds `composables` and `resources` (with `resources.current`, 1.2.1). The current `state` name in the context arrived in 2.1.0.

## Use one state inside another

A created state is also a composable. Call `asComposable` (1.1.0) to pick which props it inherits from the state that contains it.

```tsx
defineResourceLayout({
  composables: (_create, states) => ({
    Message: states.Message.asComposable({ props: { include: { message: true } } }),
    ExplicitMessage: states.Message,
  }),
  render: {
    default: {
      props: { custom: { message: createProp.string() } },
      render: (_props, { composables }) => (
        <>
          <composables.Message />
          <composables.ExplicitMessage message='Explicit value' />
        </>
      ),
    },
    Message: {
      props: { custom: { message: createProp.string() } },
      render: ({ message }) => <p>{message}</p>,
    },
  },
});
```

How inheritance works:

- `states.Message` is already a composable. `asComposable({ props: { include } })` chooses which props come from the containing state. With no `include`, nothing is inherited.
- Required props you did not inherit must be passed in JSX, and explicit JSX values win.
- References resolve when rendered, so they keep the current resource, hooks and any deferred or lazy loading.
- On a bound `defineResourceLayout` the callback is the flat `composables` property. On the unbound API it is `layout.composables`.

> **Tip:** Declare the references in the layout-level `composables` callback to avoid a TypeScript limitation with callback return inference inside reverse-mapped state entries.

When a layout's `composables` callback references a state that includes props from that same callback's preset components, those included keys keep their declared requiredness. Their value types are `unknown` until the preset schema is available.

## Derive a state

`createRenderState.fromState` (1.2.0) reuses another state's prop contract and renders it through `composables.Ref`.

```tsx
const Notice = createRenderState.fromState({
  ref: Message,
  state: 'Notice',
  props: { custom: { heading: createProp.string() } },
  render: ({ heading }, { composables, resources }) => (
    <section>
      <h2>
        {heading} — {resources.current}
      </h2>
      <composables.Ref />
    </section>
  ),
});
```

| Option          | Effect                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| no `include`    | Inherit every source prop, keeping validation, optionality and where it is supplied.  |
| `include: {…}`  | Inherit a subset. `{}` inherits none. Excluded required props must be given to `Ref`. |
| `custom`        | Add validators. Replacing an inherited key gives the new state its own validator.     |
| `composables`   | Add components. The name `Ref` is reserved.                                           |
| `lazy: true`    | Defer only `composables.Ref` through `React.lazy`. Defaults to `false`.               |

Eager, deferred and lazy references all work, including further `fromState` derivation.

## Next steps

- [Composables](./composables-and-presets.md)
- [Lazy loading](./lazy-loading.md)
- [Develop and debug](./develop-and-debug.md)
