---
title: Getting started
description: Install the library, define a layout with createProp, and render your first resource page.
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

```npm
npm i @jfdevelops/react-layout@1.6.1
```

```pnpm
pnpm add @jfdevelops/react-layout@1.6.1
```

```yarn
yarn add @jfdevelops/react-layout@1.6.1
```

```bun
bun add @jfdevelops/react-layout@1.6.1
```

Props are described with `createProp`, which the package exports. No schema library
is needed in v1.

## Define a layout and create a page

```tsx
import { createProp, defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceLayout, useResource } = defineResourceLayout({
  resources: ['users', 'settings'],
  options: {
    title: createProp.string(),
    description: createProp.string(),
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
- **`options`** declares prop definitions for values supplied when a page is created.
- **`layout.composables`** names slots that keep a stable name across pages.
- **`layout.props.include`** chooses which options the render callback receives.
- **`layout.render`** receives the validated props and the composables.
- **`name`** becomes the page's `displayName`.

Every created page provides its resource to descendants through `useResource`.

## Split a definition across files

```tsx
const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
  resources: ['users'],
  options: { title: createProp.string() },
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

> **Tip:** Keep the returned factory object. The inspector takes it as its `source`.

Next: [Resources and layouts](./guides/resource-layouts.md).

## Companion package versions

The core package installs its own internal packages. Do not install those directly.
These companion packages you choose yourself.

The table lists versions from `packages/*/package.json` at the v1.6.1 tag (commit
`f183a3d4deec330876380e3ce2d2735dde398974`). They are the set built from that commit.
Other combinations may work, but only this set is verified by the repository's own
workspace build and tests.

| You need                                          | Package                                          | Version | Peer requirements        |
| ------------------------------------------------- | ------------------------------------------------ | ------- | ------------------------ |
| Core library                                      | `@jfdevelops/react-layout`                       | 1.6.1   | `react`, `react-dom` ≥18 |
| Breadcrumb preset                                 | `@jfdevelops/react-layout-composable-breadcrumb` | 0.2.10  | `react`, `react-dom` ≥18 |
| Floating or embedded layout inspector (1.3.0+)    | `@jfdevelops/react-layout-devtools-react`        | 0.2.0   | `react`, `react-dom` ≥18 |
| Vite plugin for source links and state previews (1.4.0+) | `@jfdevelops/react-layout-devtools-vite`  | 0.1.1   | `vite` ^6, ^7 or ^8      |

Resolved by npm for core's own published `dependencies` at 1.6.1:
`@jfdevelops/react-layout-composables` 0.3.1, `@jfdevelops/react-layout-validator` 0.3.1,
`@jfdevelops/react-layout-devtools-core` 0.2.0, `@jfdevelops/create-error` 0.2.0 and
`arktype` 2.2.8.

> **Note:** The schema adapters and the navigation, copy, actions and access presets
> did not exist in v1.

## Agent skill

The package ships a `build-react-layouts` skill for coding agents:

```sh
npx skills add ./node_modules/@jfdevelops/react-layout/skills/build-react-layouts
npx skills list
```
