# @jfdevelops/react-layout

A React library for building resource-based page layouts. Define a shared layout once, then create typed page components for each resource in your app — useful for admin dashboards, CRUD apps, and any UI where many pages share the same shell.

## What it does

- **Define layouts by resource** — group pages under resources like `users`, `settings`, or nested sub-resources.
- **Reuse layout structure** — composable slots (e.g. `Layout`, `Title`, `Content`) keep markup consistent across pages.
- **Type-safe props** — validate and infer layout props with Standard Schema libraries and native React adapters. See the [Standard Schema guide](./docs/standard-schema.md), which also covers migrating from the removed `createProp` builders.

## Quick example

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactNode } from '@jfdevelops/react-layout-adapter-zod';

const { createResourceLayout, useResource } = defineResourceLayout({
  resources: ['users', 'settings'],
  options: {
    title: z.string(),
    description: z.string(),
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

Created resource layouts automatically provide their current resource.
Descendant components can read it with the definition's typed `useResource`
hook. The returned `ResourceProvider` is also available for manual boundaries.

See [`examples/basic-example`](./examples/basic-example) for a full working app.

## Render states and split definitions

`render` also accepts an object. `default` is required and becomes the plain
component; every other key becomes a typed compound component with independent
props and composables.

```tsx
const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: {
    title: z.string(),
  },
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
            error: z.object({ message: z.string() }),
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

Use `createDefinedResourceLayout` to bind resources, options, and composables
once, then split the returned building blocks across files. Its `composables`
callback receives the same resource-aware `create` function as the global API.

Render callbacks receive optional `children` in their first argument automatically.
Generated components accept React children without a custom prop declaration:

```tsx
defineResourceLayout({
  resources: ['users'],
  layout: { render: ({ children }) => <main>{children}</main> },
});
```

To require the content slot, set `props.custom.children: 'required'` on the
layout, render state, shell, or scoped component:

```tsx
const Content = createRenderState({
  state: 'Content',
  props: { custom: { children: 'required' } },
  render: ({ children }) => <section>{children}</section>,
});
```

Omitting the declaration keeps children optional. The `'required'` shorthand is
reserved for `children`; other custom props use Standard Schema definitions.
Required children are checked both by TypeScript and at runtime. A schema can
also be declared for `children`; render states may still omit children unless
the `'required'` shorthand is used. Defined composables also receive children
in both factory overloads, without declaring a prop.

```tsx
const { createRenderState, defineResourceLayout } = createDefinedResourceLayout(
  {
    resources: ['users'],
    options: {
      title: z.string(),
    },
    composables: (create) => ({
      Layout: create({ name: 'PageLayout' }),
    }),
  }
);

export const Loading = createRenderState({
  state: 'Loading',
  props: { include: { title: true } },
  render: ({ title }) => <p>Loading {title}…</p>,
});
```

The returned `resources` accessor exposes normalized definitions by default and
the original declarations through `resources.raw()`. Both calls accept an
optional selector, while `pick`, `omit`, and `isResource` retain their existing
behavior.

Use the returned `createReusable` helper for custom logic that shares the
factory's option types and validators:

```ts
const { createReusable } = createDefinedResourceLayout({
  resources: ['panedeck', 'material-ui-helper', 'jfdevelops'],
  options: {
    meta: z.object({
      owner: z.string(),
      repo: z.string(),
    }),
  },
});

export const createUrl = createReusable({
  props: {
    include: { options: { meta: true } },
    custom: { protocol: z.enum(['https', 'http']) },
  },
  fn: ({ meta, protocol }) =>
    `${protocol}://github.com/${meta.owner}/${meta.repo}`,
});

createUrl({
  meta: { owner: 'jfdevelops', repo: 'react-layout' },
  protocol: 'https',
});
```

`include` suggests `resources` and, when defined, `options`. Selected options
become function arguments directly: `options: { meta: true }` exposes `meta`.
Use `options: true` for all option definitions, or drill into object definitions
with `options: { meta: { owner: true } }` to accept `{ meta: { owner: string } }`.
Union definitions are selected whole to preserve their discriminants. Optional
definitions stay optional. `resources: true` accepts a `resources` array of the
configured resource keys. Inputs are validated before `fn` runs, and custom
definitions must use different names from selected props. Return types, including
promises, are inferred. A helper with no required inputs can be called without
arguments. Shared render-state `props` contracts do not implicitly add inputs
to a reusable function; each helper declares its own contract.

Function entries in `props.include` supply their results automatically, so the
caller does not pass those props. Resource selectors receive the complete
`resources` accessor, including `raw`, `pick`, `omit`, and `isResource`.

Top-level `select` supplies additional data to the same `fn` argument. Both
`select` and `props.include` support typed selector functions. Resource selectors
receive the complete resource accessor; option selectors receive resolved values:

```ts
const describeResource = createReusable({
  props: {
    include: { options: { meta: { owner: (owner) => owner.toUpperCase() } } },
    custom: { title: z.string() },
  },
  select: {
    resources: (resources) => resources.raw(),
    options: { meta: { repo: true } },
  },
  fn: ({ title, resources, meta }) => ({
    title,
    available: resources,
    repository: `${meta.owner}/${meta.repo}`,
  }),
});

describeResource({
  title: 'Documentation',
  options: { meta: { owner: 'jfdevelops', repo: 'react-layout' } },
});
```

Supply option source values through the reserved `options` field in the helper's
single call argument. Only explicitly selected source fields are required:
`options: { title: title => title.toUpperCase() }` requires only
`{ options: { title: string } }`. Optional source fields remain optional. Selecting
all options with `true`, or a callback over the complete options object, requires
all required configured options; callback property reads are not inferred as
dependencies. Source values validate before any selector executes, and the source
container itself does not leak into `fn`.

Options selected by key are flattened into `fn`'s argument, just like included
options. In `select`, `resources: true` supplies the full accessor; resource-only
helpers need no source input because their data is bound to the factory.
A callback over the entire options object supplies its result as `props.options`.

Use `resources.single()` inside a resource selector to require one resource key
from the caller instead of deriving a value automatically:

```ts
const describeOneResource = createReusable({
  props: { include: { resources: (resources) => resources.single() } },
  fn: ({ resources }) => resources,
});

describeOneResource({ resources: 'panedeck' });
```

The caller's `resources` value is required and validated against configured
resource paths. Nested resources use dot-delimited paths such as
`'posts.comments.replies'`; parent resource paths remain valid too. `resources: true` still accepts an array of
resource keys; ordinary resource selectors still supply their results
automatically. The same single-input descriptor can be returned from
`select.resources`.

Identical source selections, including the same callback reference, resolve once.
Different fields of the same selected object merge recursively. Identical `true`
option selections shared by include and select use the `options` source field
once rather than requiring a duplicate flattened prop.

Ambiguous collisions raise a configuration error, even when the result types
match. Rename one property, or set `overlap: 'preferProps'` or
`overlap: 'preferSelect'` to choose explicitly. Both configured input contracts
remain validated under an explicit policy. Losing option transformations are not
run. Resource callbacks also declare caller-input contracts, so each distinct
resource callback is evaluated once per call even when its output loses an
overlap. Any `single()` requirement is validated before `fn`, and the winning
output reuses the cached callback result.

Existing `true` entries in `props.include` continue to require caller-supplied,
validated values in their original flattened shape when they are not shared with
`select`. Selectors run on each invocation; return values, including promises,
pass through unchanged. The returned function's hover expands its concrete input
and return shapes. `PropsContract`, `ReusableDefinition`, `ReusableArguments`,
and `ReusableFunction` are shared standalone types for consumers and helpers.

Resource configs can also be assembled independently without losing their
resource-specific types:

```tsx
const users = createResourceConfig.forResource('users', {
  component: <Users />,
});

const config = createResourceConfig({
  ...users,
});
```

`createRenderState.defer(...)` creates a Suspense-deferred inline state, while
`createRenderState.lazy(() => import('./audit.state'))` creates a real
code-split state. A lazy state module must have exactly one named export created
by `createRenderState`.

Created states can be used as composables. The helper stays out of object
spreads, so it never becomes a compound state of its own:

```tsx
const Message = createRenderState({
  state: 'Message',
  props: { custom: { message: z.string() } },
  render: ({ message }) => <p>{message}</p>,
});

const Page = createRenderState({
  props: { custom: { message: z.string() } },
  composables: () => ({
    Message: Message.asComposable({ props: { include: { message: true } } }),
  }),
  render: (_props, { composables }) => <composables.Message />,
});

defineResourceLayout({ render: { ...Page, ...Message } });
```

For inline definitions, the layout-level `composables(create, states)` callback
receives typed references to every declared state, including states declared
later in the object. On a bound `defineResourceLayout`, this is the flat
`composables` property; on the unbound API it is `layout.composables`:

```tsx
defineResourceLayout({
  composables: (_create, states) => ({
    Message: states.Message.asComposable({
      props: { include: { message: true } },
    }),
    ExplicitMessage: states.Message,
  }),
  render: {
    default: {
      props: { custom: { message: z.string() } },
      render: (_props, { composables }) => (
        <>
          <composables.Message />
          <composables.ExplicitMessage message='Explicit value' />
        </>
      ),
    },
    Message: {
      props: { custom: { message: z.string() } },
      render: ({ message }) => <p>{message}</p>,
    },
  },
});
```

`states.Message` is already a composable. `asComposable({ props: { include: { ...: true } } })`
selects which component props to inherit from the containing state's resolved
render props. The default carries none; unselected required props must be
passed in JSX, and explicit JSX values override inherited values. Creation-time
options remain bound to the resource layout. References resolve when rendered,
so they retain the current resource, hooks, deferred loading, and lazy loading.

Define state-specific composables with `createRenderState` when their callback
needs `create` or dependencies. Keeping inline references in the layout-level
callback avoids TypeScript's [callback-return inference limitation inside reverse
mapped state entries](https://github.com/microsoft/TypeScript/issues/53018), while keeping one generic for the complete render map.

Entire created resource components can also be loaded lazily:

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

Lazy modules use named exports and must export exactly one component created by
the library. Nested resources use typed dot paths such as
`admin.users.detail`. Lazy components preserve compound state access such as
`<Users.NotFound />` and share one cached module load.

When a layout's `composables` callback references a state that includes props from
that same callback's preset components, those included keys keep their declared
requiredness and optionality. Their value types are `unknown` until the preset
schema is available; TypeScript cannot infer a callback's return value into its
own arguments. Shared preset and option props retain their known value types.

### Deriving render states

`createRenderState` render callbacks expose the resource accessor as `context.resources`, including `resources.current` and the typed selection helpers.

Use `fromState` to reuse a created state's prop contract and render it through `composables.Ref`:

```tsx
const Message = createRenderState({
  state: 'Message',
  props: { custom: { message: z.string() } },
  render: ({ message }) => <p>{message}</p>,
});

const Notice = createRenderState.fromState({
  ref: Message,
  state: 'Notice',
  props: { custom: { heading: z.string() } },
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

Omitting `props.include` inherits all source props, preserving their validation, optionality, and config/component passthrough behavior. An explicit `props.include` selects a subset using the usual include-prop syntax; an empty object selects none. Excluded required source props must be supplied when rendering `Ref`. Selected values carry over automatically, and explicit JSX values override them.

`props.custom` adds validators for the new state. Replacing an inherited key through `custom` gives the new state its own validator; supply the original value explicitly to `Ref`. A `composables` callback can add components to the new state; the name `Ref` is reserved. The source renders with its original composables.

Eager, deferred, and lazy references are supported, including further `fromState` derivation. A lazy reference loads only when the derived state renders. Set `lazy: true` on `fromState` to defer only `composables.Ref` through `React.lazy` while the derived state renders normally. It defaults to `false` and preserves inherited prop validation; loading states work as usual. This schedules an existing ref without creating a separate bundle.

### Component namespaces

By default, `createResourceLayout` returns a callable component with named state components attached. Set `namespace: true` to return a plain object instead, so autocomplete on `Users.` suggests only `Root` and the named states:

```tsx
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
<Users.Root />;
<Users.Loading />;

const Callable = definition.createResourceLayout({
  resource: 'users',
  name: 'Callable',
  namespace: false,
});
<Callable />;
```

`createDefinedResourceLayout({ resources: ['users'], namespace: true })` also sets the shared default. Its bound `defineResourceLayout({ namespace: false, render: ... })` can override it. The closest setting wins: shared factory → definition → component creation. Resource-specific factories inherit the definition's setting. Omitting `namespace` everywhere is equivalent to `false`.

In namespace mode, component metadata and `makeComposable` remain available on `Root`. The state name `Root` is reserved only when namespace mode is enabled.

## Workspace

| Path                     | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `packages/core`          | `@jfdevelops/react-layout` — the published library |
| `examples/basic-example` | Demo app showing resource layouts in action        |

## Development

**Requirements:** Node `^20.19.0 \|\| >=22.12.0`, pnpm `10.28.1`, React `>=18`

```bash
pnpm install
pnpm dev              # library dev server
pnpm dev:basic-example # run the example app
pnpm build            # build the library
pnpm test             # run tests
```

## Workspace tooling

Run `pnpm lint` for Oxlint checks, `pnpm lint:fix` for fixes, `pnpm format` for
Oxfmt followed by lint fixes and a final formatting pass, and `pnpm format:check`
for a formatting check. CI runs lint and formatting checks before compilation.

The workspace root pins TypeScript 7.0.2 (the latest stable npm release when
configured). Package scripts use the root compiler. The Vite devtools runtime
retains TypeScript 6.0.3 because its instrumentation uses the legacy compiler
API. Autocomplete compatibility tests explicitly use the `typescript-5-9` and
`typescript-6` aliases; workspace compilation checks the current compiler.

Oxlint enables its built-in TypeScript, React, React Hooks, JSX accessibility,
import, Vitest, and Oxc plugins. These require no separate plugin packages.
`@stylistic/eslint-plugin` enforces expanded nonempty object literals and blank
lines before returns. `tools/oxlint-plugin.mjs` wraps its property newline rule
to check runtime object literals only, leaving type literal formatting to Oxfmt.
Empty objects stay compact. Generated files and build outputs are excluded.

The file-scoped overrides in `.oxlintrc.json` baseline existing semantic lint
findings, including React effect patterns and compile-only test assertions.
They do not exempt object formatting. Remove each exception when its underlying
code is addressed; new files receive the enabled correctness checks by default.

## Install

```bash
pnpm add @jfdevelops/react-layout
```

## Agent skill

The package includes a `build-react-layouts` skill that teaches compatible
coding agents the library's recommended architecture and factory patterns.

After installing the package, install the bundled skill into the current
project's detected agents:

```bash
npx skills add ./node_modules/@jfdevelops/react-layout/skills/build-react-layouts
```

The command prompts for the target agents and whether to copy or link the
skill. Verify the installation with:

```bash
npx skills list
```

Package installation alone does not guarantee activation because agents use
different skill directories.

Projects that want dependency-provided skills synchronized after dependency
installation can opt into [`skills-npm`](https://github.com/antfu/skills-npm):

```bash
pnpm add --save-dev skills-npm
```

```json
{
  "scripts": {
    "prepare": "skills-npm --yes"
  }
}
```

This synchronization belongs in the consuming application so each project can
choose which agents and skill directories it supports.

## Optional devtools and shared defaults

Use `ReactLayoutDevtools` from `@jfdevelops/react-layout-devtools-react` for a floating graph inspector, or embed `ReactLayoutDevtoolsContent` in TanStack Devtools. Pass the result of `createDefinedResourceLayout` or `defineResourceLayout` as `source`; no provider is required. The separate `@jfdevelops/react-layout-devtools-core` package exposes the inspection protocol for other adapters.

See [devtools and shared defaults](docs/devtools-and-shared-defaults.md) for setup, global prop contracts, reusable naming conventions, and local overrides.

See [lazy loading](docs/lazy-loading.md) for shared preload and retry behavior, typed lazy errors, and scoped content shells that avoid circular imports.

### Hosted surface families

Use `defineResourceSurface` from a defined layout factory when a pane or overlay
has its own resources, props, and chrome but belongs to the root product area.

```tsx
const admin = createDefinedResourceLayout({ resources: ['users', 'teams'] });
const panes = admin.defineResourceSurface({
  resources: ['create', 'detail'],
  host: { resources: ['users'] },
});
const paneLayout = panes.defineResourceLayout({ render: () => <aside /> });
const UserCreatePane = paneLayout.createResourceLayout.forResource({
  resource: 'create',
  hostedBy: 'users',
})();
```

Hosted factories require `hostedBy` for direct creation and for resource binding
through `forResource` or `forResources`. Use `host: { resources: '*' }` to allow
any root resource. Omitting `host` creates an independent family. Root factories
keep their existing API and reject `hostedBy`.

For one-file definitions, `defineResourceSurfaces({ page: { resources, render },
pane: { resources, host: { surface: 'page', resources: '*' }, render } })` returns
one completed layout per key. Each entry supports the existing `options`,
`composables`, `props`, and `render` contracts; an optional `shell` uses the
existing persistent `withLayout` implementation. You can also pass completed
layouts to register them without changing their types or identity. See
[Hosted surfaces](docs/hosted-surfaces.md) for the full multi-file example.
