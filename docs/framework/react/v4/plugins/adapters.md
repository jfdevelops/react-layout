---
title: Adapters
description: Validate React nodes and elements with your preferred schema library.
order: 10
---

Adapters provide `reactNode()` and `reactElement()` schemas for React values.
Install the adapter matching your schema library when layout options or custom
props contain JSX. Ordinary string, number, and object schemas need no adapter.

## Choose a package

| Package | Schema library peer |
| --- | --- |
| `@jfdevelops/react-layout-adapter-arktype` | ArkType `^2.2.8` |
| `@jfdevelops/react-layout-adapter-zod` | Zod `^4.0.0` |
| `@jfdevelops/react-layout-adapter-valibot` | Valibot `^1.0.0` |
| `@jfdevelops/react-layout-adapter-effect` | Effect `^4.0.0` |
| `@jfdevelops/react-layout-adapters` | Factory for writing your own adapter |

The adapters also require React 18 or newer. Install only the schema-specific
package you use; it includes the shared adapter factory as a dependency.

```npm
npm i @jfdevelops/react-layout-adapter-zod zod
```

```pnpm
pnpm add @jfdevelops/react-layout-adapter-zod zod
```

```yarn
yarn add @jfdevelops/react-layout-adapter-zod zod
```

```bun
bun add @jfdevelops/react-layout-adapter-zod zod
```

## Use React values in a layout

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { reactNode } from '@jfdevelops/react-layout-adapter-zod';

const { createResourceLayout } = defineResourceLayout({
  resources: ['services'],
  options: {
    title: reactNode(),
  },
  layout: {
    props: { include: { title: true } },
    render: function PageLayout({ title, children }) {

      return <main><h1>{title}</h1>{children}</main>;
    },
  },
});

export const ServicesPage = createResourceLayout({
  resource: 'services',
  title: <span>Services</span>,
});
```

`reactNode()` describes renderable content; `reactElement()` requires a React
element such as `<Icon />`, rather than the `Icon` component function. Empty
content and optionality depend on the schema: explicitly allow `undefined` with
your schema library when a prop may be omitted. Effect's helpers return Standard
Schema wrappers directly.

## Write an adapter

Use `createAdapter` from `@jfdevelops/react-layout-adapters` to wrap the supplied
React predicates in your schema library's constructors. It takes `node` and
`element` callbacks and returns the two schema helpers, preserving their native
types.

See [Props and validation](../guides/props-and-validation.md#react-values-and-adapters)
for composition examples and a custom adapter implementation.
