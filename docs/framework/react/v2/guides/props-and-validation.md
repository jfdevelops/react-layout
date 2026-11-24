---
title: Props and validation
description: Describe props with Standard Schema (2.6.0) or the deprecated createProp builder, and validate them at runtime.
order: 40
---

v2 supports two ways to describe a prop. **Standard Schema** arrived in 2.6.0 and is the recommended path. **`createProp`**, the original builder, still works for all of v2 but is deprecated and was removed in v3. The two can coexist in one prop map, which makes migrating one prop at a time possible.

In this guide you will:

- use an object schema or a schema map as `options`
- control inputs, outputs, defaults and children
- add React node and element schemas with an adapter package
- keep using `createProp` while you migrate

## Object schemas and option maps

A synchronous Standard Schema object is validated together, which preserves object-level refinements, defaults and transforms. Its input and output must be objects.

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactNode, reactElement } from '@jfdevelops/react-layout-adapter-zod';

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
      include: { title: true, description: true, icon: 'optional' },
      custom: { footer: reactNode() },
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
```

Every required schema input must be supplied, including fields the render callback does not select. `props.include` chooses what to render and does not weaken the schema.

Options can also be a map keyed by option name. The map form supports schemas, schema constants and legacy definitions side by side:

```ts
const options = {
  title: z.string(),
  legacyCount: createProp.number(),
};
```

## Inputs, outputs, defaults and transforms

Callers supply schema **input** values. Render callbacks and reusable functions receive **output** values. A missing value is validated as `undefined`, so optional schemas and defaults work.

```tsx
props: {
  custom: {
    label: z.string().default('Items'),
    count: z.string().transform(Number),
  },
},
render: ({ label, count }) => <p>{label}: {count + 1}</p>,
```

Validation is synchronous. An async schema throws a clear error. Errors are contextual `PropError` instances with `path`, `layoutName`, `resource` and `issues`.

## Children

Render callbacks receive optional `children` in their first argument, and generated components accept React children without a declaration (added in 2.3.0). To require the content slot, set `props.custom.children: 'required'` on the layout, render state, shell or scoped component. The shorthand is reserved for `children`; other custom props use schemas or `createProp`. Required children are checked by TypeScript and at runtime. In v2, existing validator-based `children` declarations keep their legacy fallback-state behavior.

## React values and adapters

React nodes and elements need an adapter. Install the package for your schema library:

```npm
npm i @jfdevelops/react-layout-adapter-zod@0.1.0 zod
# or
npm i @jfdevelops/react-layout-adapter-valibot@0.1.0 valibot
npm i @jfdevelops/react-layout-adapter-arktype@0.1.0 arktype
```

```pnpm
pnpm add @jfdevelops/react-layout-adapter-zod@0.1.0 zod
# or
pnpm add @jfdevelops/react-layout-adapter-valibot@0.1.0 valibot
pnpm add @jfdevelops/react-layout-adapter-arktype@0.1.0 arktype
```

```yarn
yarn add @jfdevelops/react-layout-adapter-zod@0.1.0 zod
# or
yarn add @jfdevelops/react-layout-adapter-valibot@0.1.0 valibot
yarn add @jfdevelops/react-layout-adapter-arktype@0.1.0 arktype
```

```bun
bun add @jfdevelops/react-layout-adapter-zod@0.1.0 zod
# or
bun add @jfdevelops/react-layout-adapter-valibot@0.1.0 valibot
bun add @jfdevelops/react-layout-adapter-arktype@0.1.0 arktype
```

Each adapter has `react` and its library as peer dependencies, and depends on the shared `@jfdevelops/react-layout-adapters` factory. Versions are in the [compatibility table](../getting-started.md#companion-package-versions). There is no Effect adapter in v2.

- `reactElement()` infers `React.ReactElement` and uses `React.isValidElement`. It accepts `<Icon />`, including fragments, and rejects strings, portals, arbitrary objects and component functions.
- `reactNode()` infers `React.ReactNode`. It accepts strings, numbers, booleans, `null`, `undefined`, elements, portals and collections of nodes, and on React 19 also bigint and promise-like nodes. Validation never invokes components or awaits promises. Convert one-shot iterators to arrays first.
- Schema-backed props keep their declared names. They do not become the capitalized component slots used by legacy `JSX.Element` definitions.
- A node schema permits empty content. Use a narrower schema, or `children: 'required'`, if a slot must hold a visible value.

To write an adapter for another library, use `createAdapter` from `@jfdevelops/react-layout-adapters`:

```ts
export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<ReactNode>(check).optional(),
  element: (check) => z.custom<ReactElement>(check),
});
```

## Reusable selections

Standard Schema does not expose object-field introspection. For schema-backed option fields, reusable selections accept the whole field (`meta: true`) or a selector (`meta: (value) => value.owner`). Recursive field selections remain available for legacy object definitions.

## Keep using `createProp` while you migrate

`createProp` and the custom `@jfdevelops/react-layout-validator` builder API are deprecated in 2.6.0. Existing definitions stay supported and can share a prop map with schemas. Removal happened in v3.

| Legacy definition                                    | Zod replacement                     |
| ---------------------------------------------------- | ----------------------------------- |
| `createProp.string()`                                | `z.string()`                        |
| `createProp.number().optional()`                     | `z.number().optional()`             |
| `createProp.array(createProp.string())`              | `z.array(z.string())`               |
| `createProp.object({ name: createProp.string() })`   | `z.object({ name: z.string() })`    |
| `createProp.component({ type: 'ReactNode' })`        | `reactNode()`                       |
| `createProp.component({ type: 'JSX.Element' })`      | `reactElement()` for element values |

Legacy component-valued slots and render-function declarations continue to work. An element schema validates an element value, not a component function or a render callback. Keep the legacy definition for those until you move them to an explicit function schema.

## Next steps

- [Render states](./render-states.md)
- [Reusable helpers](./reusable-helpers.md)
- [Migrating to v3](../../v3/migration.md) removes `createProp`
