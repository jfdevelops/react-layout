---
title: Render states
description: Add Loading, Error, NotFound and custom states to a page, share them, and derive new states from old ones.
order: 40
---

A render state is a named variant of a page. A page always has a `default` state. Any other key you add becomes a typed component attached to the page, such as `<Users.Loading />`.

In this guide you will:

- declare states inline and as separate building blocks
- reuse one state inside another
- derive a state from an existing one
- share a shell across states

## Declare states inline

Set `layout.render` to an object. `default` is required and becomes the plain component. Every other key gets its own props and composables.

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: {
    title: z.string(),
  },
  layout: {
    render: {
      default: {
        props: {
          include: {
            title: true,
          },
        },
        render: ({ title }) => <h1>{title}</h1>,
      },
      Loading: () => <p>Loading users…</p>,
      Error: {
        props: {
          custom: {
            error: z.object({
              message: z.string(),
            }),
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

export function UsersScreen() {
  return (
    <>
      <Users />
      <Users.Loading />
      <Users.NotFound />
    </>
  );
}
```

State names `default`, `Loading`, `Error` and `NotFound` are suggested by the editor, and you can add your own. Each state keeps its own props separate from the default component's props.

> **Note:** With `namespace: true` the default component is `Users.Root` instead of `Users`. See [Resources and layouts](./resource-layouts.md#component-namespaces).

## Declare states as building blocks

`createDefinedResourceLayout` returns `createRenderState`. Use it to write each state in its own file and combine them with object spread.

```tsx
export const Loading = createRenderState({
  state: 'Loading',
  props: { include: { title: true } },
  render: ({ title }) => <p>Loading {title}…</p>,
});

defineResourceLayout({ render: { default: Page, ...Loading } });
```

Render callbacks receive their state's props first and a context second. The context holds `composables`, `resources` (with `resources.current`) and `state`, the name of the state being rendered. A callback also receives `children` automatically.

Two variants load work later:

- `createRenderState.defer(...)` makes a Suspense-deferred inline state.
- `createRenderState.lazy(() => import('./audit.state'))` makes a real code-split state. The module must have exactly one named export created by `createRenderState`. See [Lazy loading](./lazy-loading.md).

## Use one state inside another

A created state is also a composable. Call `asComposable` to pick which props it inherits from the state that contains it.

```tsx
import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const factory = createDefinedResourceLayout({
  resources: ['users'],
});

export const layout = factory.defineResourceLayout({
  composables: (_create, states) => ({
    Message: states.Message.asComposable({
      props: {
        include: {
          message: true,
        },
      },
    }),
    ExplicitMessage: states.Message,
  }),
  render: {
    default: {
      props: {
        custom: {
          message: z.string(),
        },
      },
      render: (_props, { composables }) => (
        <>
          <composables.Message />
          <composables.ExplicitMessage message='Explicit value' />
        </>
      ),
    },
    Message: {
      props: {
        custom: {
          message: z.string(),
        },
      },
      render: ({ message }) => <p>{message}</p>,
    },
  },
});
```

How inheritance works:

- `states.Message` is already a composable. `asComposable({ props: { include } })` chooses which props come from the containing state.
- With no `include`, nothing is inherited. Required props you did not inherit must be passed in JSX, and explicit JSX values win over inherited ones.
- References resolve when rendered, so they keep the current resource, hooks and any deferred or lazy loading.
- On a bound `defineResourceLayout` the callback is the flat `composables` property. On the unbound API it is `layout.composables`.

> **Tip:** Declare the references in the layout-level `composables` callback. That avoids a TypeScript limitation with callback return inference inside reverse-mapped state entries. If a state needs `create` or its own dependencies, declare its composables with `createRenderState` instead.

## Derive a state

`createRenderState.fromState` reuses another state's prop contract and renders it through `composables.Ref`.

```tsx
import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createRenderState } = createDefinedResourceLayout({
  resources: ['users'],
});

const Message = createRenderState({
  state: 'Message',
  props: {
    custom: {
      message: z.string(),
    },
  },
  render: ({ message }) => <p>{message}</p>,
});

export const Notice = createRenderState.fromState({
  ref: Message,
  state: 'Notice',
  props: {
    custom: {
      heading: z.string(),
    },
  },
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

| Option          | Effect                                                                                  |
| --------------- | --------------------------------------------------------------------------------------- |
| no `include`    | Inherit every source prop, keeping validation, optionality and where it is supplied.    |
| `include: {…}`  | Inherit a subset. `{}` inherits none. Excluded required props must be given to `Ref`.   |
| `custom`        | Add validators. Replacing an inherited key gives the new state its own validator.       |
| `composables`   | Add components to the new state. The name `Ref` is reserved.                            |
| `lazy: true`    | Defer only `composables.Ref` through `React.lazy`. Defaults to `false`.                 |

Eager, deferred and lazy references all work, including further `fromState` derivation. The source renders with its original composables.

## Share a shell across states

The second argument of a state's render callback includes `state`. A shared state used through `asComposable()` sees the calling state, even through nested or lazy references.

Inline render maps infer the union of their declared state names. Independent `createRenderState` definitions use `string`, because anything may call them. When you create a shared shell before its layout, bind the calling-state union with `createRenderState.forStates(...)`:

```tsx
const createState = createRenderState.forStates(
  'default',
  'Loading',
  'Error',
  'NotFound',
);
const Shell = createState({
  state: 'Layout',
  render: ({ children }, { composables, state }) => (
    <composables.Layout>
      {state === 'Loading' ? <Skeleton /> : children}
    </composables.Layout>
  ),
});
```

Use the shell from each state through `Shell.asComposable()`. Lazy defaults created with `defineLazyDefaults.createRenderState` also receive their literal `'Loading'` or `'Error'` state in context, so they can reuse the same shell.

> **Warning:** Mounting another layout or a named state directly starts that component's own state context. It does not inherit the caller's.

## Next steps

- [Composables and presets](./composables-and-presets.md)
- [Lazy loading](./lazy-loading.md) for lazy `Loading` and `Error` defaults
- [Develop and debug](./develop-and-debug.md) to preview a state on a mounted page
