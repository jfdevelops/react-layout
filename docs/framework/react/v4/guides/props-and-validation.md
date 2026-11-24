---
title: Props and validation
description: Describe props with Standard Schema, validate them at runtime, and use React node schemas from the adapter packages.
order: 20
---

In this guide you will:

- describe options with an object schema or a schema map
- control inputs, outputs, defaults and children
- add React node and element schemas with an adapter package

React Layout validates and types props with synchronous [Standard Schema](https://standardschema.dev) v1 definitions. You can pass a whole object schema as `options`, or individual schemas wherever a prop is declared: `props.custom`, composables, render states, scoped components, reusable helpers and option maps.

## Object schemas and option maps

A single object schema is validated together, which preserves object-level refinements, defaults and transforms. The schema's input and output must both be objects.

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactElement, reactNode } from '@jfdevelops/react-layout-adapter-zod';

const optionsSchema = z.object({
  title: z.string().min(1),
  description: reactNode(),
  icon: reactElement().optional(),
});

const { createResourceLayout } = defineResourceLayout({
  resources: ['users'],
  options: optionsSchema,
  layout: {
    props: {
      include: {
        title: true,
        description: true,
        icon: 'optional',
      },
      custom: {
        footer: reactNode(),
      },
    },
    render: ({ title, description, icon, footer }) => (
      <main>
        <h1>
          {icon}
          {title}
        </h1>
        {description}
        <footer>{footer}</footer>
      </main>
    ),
  },
});

export const Users = createResourceLayout({
  resource: 'users',
  name: 'Users',
  title: 'Users',
  description: <p>Manage users</p>,
});
```

Creation-time inputs are bound to the layout, and values supplied through the component are merged before validation. Every required schema input must be supplied, including fields the render callback does not select: `props.include` chooses what to render, and it does not weaken the schema's contract.

Options can instead be a map of schemas keyed by option name, where each option is validated on its own:

```ts
const options = {
  title: z.string(),
  icon: reactElement().optional(),
};
```

## Inputs, outputs, defaults and transforms

Callers supply schema **input** values. Render callbacks and reusable functions receive schema **output** values. A missing value is validated as `undefined`, so optional schemas and defaults work.

```tsx
props: {
  custom: {
    label: z.string().default('Items'),
    count: z.string().transform(Number),
  },
},
render: ({ label, count }) => <p>{label}: {count + 1}</p>,
// <Page count="2" /> renders label="Items", count=2.
```

Validation is synchronous. An async schema throws a clear error instead of passing a promise into render props. Validate async data before rendering.

## Children

Every React component the library creates accepts optional `children`, including layouts, shells, render states and scoped components. You do not declare `props.custom.children`. Reusable helpers and option schemas accept children only when you declare them.

To require the content slot, use the shorthand on the layout, render state, shell or scoped component. It is reserved for `children`; it is checked by TypeScript and at runtime.

```tsx
const Content = createRenderState({
  state: 'Content',
  props: { custom: { children: 'required' } },
  render: ({ children }) => <section>{children}</section>,
});
```

To use a different type, declare a schema for `children`; it replaces the default and keeps its input, output, defaults and transforms.

```tsx
props: { custom: { children: z.object({ label: z.string() }) } },
render: ({ children }) => <p>{children.label}</p>,
```

## React values and adapters

React nodes and elements are not described by ordinary schema libraries, so the React Layout adapter packages provide `reactNode()` and `reactElement()` in the native style of each library. Install only the adapter for the library you use.

```npm
npm i @jfdevelops/react-layout-adapter-zod@1.0.0 zod
# or
npm i @jfdevelops/react-layout-adapter-valibot@1.0.0 valibot
npm i @jfdevelops/react-layout-adapter-arktype@1.0.0 arktype
npm i @jfdevelops/react-layout-adapter-effect@1.0.0 effect
```

```pnpm
pnpm add @jfdevelops/react-layout-adapter-zod@1.0.0 zod
# or
pnpm add @jfdevelops/react-layout-adapter-valibot@1.0.0 valibot
pnpm add @jfdevelops/react-layout-adapter-arktype@1.0.0 arktype
pnpm add @jfdevelops/react-layout-adapter-effect@1.0.0 effect
```

```yarn
yarn add @jfdevelops/react-layout-adapter-zod@1.0.0 zod
# or
yarn add @jfdevelops/react-layout-adapter-valibot@1.0.0 valibot
yarn add @jfdevelops/react-layout-adapter-arktype@1.0.0 arktype
yarn add @jfdevelops/react-layout-adapter-effect@1.0.0 effect
```

```bun
bun add @jfdevelops/react-layout-adapter-zod@1.0.0 zod
# or
bun add @jfdevelops/react-layout-adapter-valibot@1.0.0 valibot
bun add @jfdevelops/react-layout-adapter-arktype@1.0.0 arktype
bun add @jfdevelops/react-layout-adapter-effect@1.0.0 effect
```

Each adapter has `react` and its schema library as peer dependencies, and depends only on the shared `@jfdevelops/react-layout-adapters` factory. The package guidance is in [Companion packages](../installation.md#companion-packages). Each helper returns the library's own schema type, so ordinary composition works:

```ts
// Zod
const content = z.object({
  body: reactNode(),
  icons: z.array(reactElement()),
  footer: reactNode().optional(),
});

// Valibot
const content = v.object({
  body: reactNode(),
  icons: v.array(reactElement()),
  footer: v.optional(reactNode()),
});

// ArkType
const content = type({
  body: reactNode(),
  icons: reactElement().array(),
  'footer?': reactNode(),
});

// Effect: its helpers are Standard Schemas already, but a schema you compose
// yourself is not, so convert it.
const content = Schema.toStandardSchemaV1(
  Schema.Struct({
    body: reactNode(),
    icons: Schema.Array(reactElement()),
    footer: Schema.optional(reactNode()),
  }),
);
```

What they accept:

- `reactElement()` infers `React.ReactElement` and uses `React.isValidElement`. It accepts `<Icon />`, including fragments, and rejects strings, portals, arbitrary objects and component functions such as `Icon`.
- `reactNode()` infers `React.ReactNode`. It accepts strings, numbers, booleans, `null`, `undefined`, elements, portals and collections of nodes. On React 19 it also accepts bigint and promise-like nodes. Validation never invokes components or awaits promises. One-shot iterators such as generators must be materialized into an array first so validation cannot consume the children before React does.
- A node schema permits empty content. Use a narrower schema if a slot must hold a visible value, or `children: 'required'` for the content slot.

### Writing an adapter for another library

If your schema library has no adapter, build one with `createAdapter` from `@jfdevelops/react-layout-adapters`. Supply callbacks that wrap the provided React predicates in native schemas:

```ts
import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<ReactNode>(check).optional(),
  element: (check) => z.custom<ReactElement>(check),
});
```

The factory preserves each callback's exact schema type and constructs a new schema each time a helper is called. Messages and optionality belong in the callbacks. The four published adapters use this same factory.

## Errors

A failed prop throws a contextual `PropError`. Its `path`, `layoutName` and `resource` identify the failing prop, and `issues` retains every schema issue with its path prefixed by the prop name. The message reads `Invalid prop "<path>": <message>`, using the first issue's message. This holds for a missing required prop too.

## Reusing component props

`createPropsFromComponent(Component)` extracts the prop schemas retained for a created component. Use `.pick(...)` or `.omit(...)` to reuse a subset. Implicit `children` appears in those schemas. `componentSlot({ props })` declares a prop that holds a nested component slot; a slot named `actions` is supplied and rendered as `Actions`.

## Inspecting schemas

The devtools show each prop's type, schema vendor and requirement without validating anything. Predicate-based schemas such as `reactNode()` carry a name so they appear as `ReactNode`; unknown schemas show `unknown`. See [Develop and debug](./develop-and-debug.md).

## Next steps

- [Render states](./render-states.md) uses `props.custom` for per-state props.
- [Reusable helpers](./reusable-helpers.md) selects option schemas into typed functions.
- [Troubleshooting](./troubleshooting.md) explains common validation errors.
