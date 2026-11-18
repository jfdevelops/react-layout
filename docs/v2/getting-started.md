---
title: Getting started
description: Install the library, define a layout, and render your first resource page.
order: 20
---

In this guide you will install the package, render a first page and see how to
split a definition across files.

## Requirements

- React 18 or newer. `react` and `react-dom` are peer dependencies (`>=18`).
- Node `^20.19.0 || >=22.12.0` for tooling.
- TypeScript is strongly recommended. The repository's CI checks the published
  factory types on TypeScript 5.9 and 6.

## Install

```sh
pnpm add @jfdevelops/react-layout
```

Props can be described two ways in v2:

- **Standard Schema** (from 2.6.0): Zod, Valibot, ArkType or any synchronous Standard
  Schema library. This is the recommended path.
- **`createProp`** (all of v2, deprecated in 2.6.0): the built-in builder. It is removed
  in v3.

```sh
pnpm add zod @jfdevelops/react-layout-adapter-zod
```

If you are on a release before 2.6.0, use `createProp` and skip the adapter.

## Define a layout and create a page

```tsx
import { z } from 'zod';
import { defineResourceLayout } from '@jfdevelops/react-layout';

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

What each part does:

- **`resources`** names the pages. `resource: 'users'` is checked against this list.
- **`options`** declares schemas for values supplied when a page is created.
- **`layout.composables`** names slots that keep a stable name across pages.
- **`layout.props.include`** chooses which options the render callback receives.
- **`layout.render`** receives the validated props and the composables.
- **`name`** becomes the page's `displayName`.

Every created page provides its resource to descendants through `useResource`.

## Split a definition across files

```tsx
const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
  resources: ['users'],
  options: { title: z.string() },
  composables: (create) => ({
    Layout: create({ name: 'PageLayout' }),
  }),
});

export const Loading = createRenderState({
  state: 'Loading',
  props: { include: { title: true } },
  render: ({ title }) => <p>Loading {title}…</p>,
});

export const usersLayout = defineResourceLayout({
  render: { default: () => <p>Users</p>, ...Loading },
});
```

> **Tip:** Keep the returned factory object. The devtools and several helpers take it
> as their `source`.

Next: [Resources and layouts](./guides/resource-layouts.md).

## Companion package versions

The core package installs its own internal packages. Do not install those directly.
These companion packages you choose yourself.

The table lists versions from `packages/*/package.json` at the v2.7.0 tag (commit
`c55251276d2399f27e50bb238fb22ea18741efe6`). They are the set built from that commit.
Other combinations may work, but only this set is verified by the repository's own
workspace build and tests.

| You need                                          | Package                                          | Version | Peer requirements        |
| ------------------------------------------------- | ------------------------------------------------ | ------- | ------------------------ |
| Core library                                      | `@jfdevelops/react-layout`                       | 2.7.0   | `react`, `react-dom` ≥18 |
| React node and element schemas for Zod            | `@jfdevelops/react-layout-adapter-zod`           | 0.1.0   | `zod` ^4.0.0             |
| …for Valibot                                      | `@jfdevelops/react-layout-adapter-valibot`       | 0.1.0   | `valibot` ^1.0.0         |
| …for ArkType                                      | `@jfdevelops/react-layout-adapter-arktype`       | 0.1.0   | `arktype` ^2.2.8         |
| …for another Standard Schema library              | `@jfdevelops/react-layout-adapters`              | 0.1.0   | `react` ≥18              |
| Breadcrumb preset                                 | `@jfdevelops/react-layout-composable-breadcrumb` | 0.2.14  | `react`, `react-dom` ≥18 |
| Floating or embedded layout inspector             | `@jfdevelops/react-layout-devtools-react`        | 0.4.0   | `react`, `react-dom` ≥18 |
| Vite plugin for source links and state previews   | `@jfdevelops/react-layout-devtools-vite`         | 0.1.2   | `vite` ^6, ^7 or ^8      |

Resolved by npm for core's own published `dependencies` at 2.7.0:
`@jfdevelops/react-layout-composables` 0.6.0, `@jfdevelops/react-layout-validator` 0.5.0,
`@jfdevelops/react-layout-devtools-core` 0.4.0, `@jfdevelops/create-error` 0.2.1 and
`arktype` 2.2.8.

> **Note:** The Effect adapter and the navigation, copy, actions and access presets do
> not exist in v2. They arrived in v3.

## Agent skill

The package ships a `build-react-layouts` skill for coding agents:

```sh
npx skills add ./node_modules/@jfdevelops/react-layout/skills/build-react-layouts
npx skills list
```
