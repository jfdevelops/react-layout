---
title: Getting started
description: Install the library, define a layout, and render your first resource page.
order: 20
---

In this guide you will install the package, render a first page and see how to split a definition across files.

This page installs `@jfdevelops/react-layout` 4, defines a layout for two
resources and renders a page from it. It then lists the companion packages you
may add later and the versions that shipped with v4.

## Requirements

- React 18 or newer. `react` and `react-dom` are peer dependencies (`>=18`).
- Node `^20.19.0 || >=22.12.0` for tooling. The package declares this in its
  `engines` field.
- TypeScript is strongly recommended. The library's value is its inferred types.
  The repository's CI checks the published factory types on TypeScript 5.9 and 6.

## Install

Install the library, plus a Standard Schema library to describe your props.
Zod is used throughout these docs, but any synchronous Standard Schema library
works.

```sh
pnpm add @jfdevelops/react-layout zod
```

If a prop needs to hold React content (a node or an element) install the adapter
for your schema library. See
[Props and validation](./guides/props-and-validation.md#react-values-and-adapters).

```sh
pnpm add @jfdevelops/react-layout-adapter-zod
```

## Define a layout and create a page

`defineResourceLayout` takes the resources your app has, the options every page
can supply, and a `layout` that describes how a page renders. It returns
`createResourceLayout`, which makes one typed page component per resource.

```tsx example=v4/quick-start.tsx
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
      Layout: create({
        name: 'PageLayout',
      }),
      Title: create({
        name: 'PageTitle',
      }),
    }),
    props: {
      include: {
        title: true,
        description: true,
      },
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

export const UsersPage = createResourceLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
  description: 'Manage users.',
});
```

What each part does:

- **`resources`** names the pages. `resource: 'users'` is checked against this
  list, so a typo is a compile error.
- **`options`** declares schemas for values that belong to a page when it is
  created, such as its title.
- **`layout.composables`** names slots (`Layout`, `Title`). Slots are React
  components that keep a stable name and identity across pages.
- **`layout.props.include`** chooses which options the render callback receives.
  `true` means the value is required when the page is created.
- **`layout.render`** receives the validated props and the composables and
  returns your markup.
- **`name`** becomes the page's `displayName`, which helps in React DevTools.

Every created page provides its resource to descendants. Read it with the
definition's `useResource` hook. It throws a `MissingResourceProviderError`
outside a page.

Render `<UsersPage />` anywhere in your tree like any other component.

## Split a definition across files

A larger app binds the resources, options and composables once and exports the
building blocks. `createDefinedResourceLayout` returns them.

```tsx example=v4/split-definitions.tsx
import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createRenderState, defineResourceLayout } = createDefinedResourceLayout(
  {
    resources: ['users'],
    options: {
      title: z.string(),
    },
    composables: (create) => ({
      Layout: create({
        name: 'PageLayout',
      }),
    }),
  },
);

export const Loading = createRenderState({
  state: 'Loading',
  props: {
    include: {
      title: true,
    },
  },
  render: ({ title }) => <p>Loading {title}…</p>,
});

export const usersLayout = defineResourceLayout({
  render: {
    default: () => <p>Users</p>,
    ...Loading,
  },
});
```

> **Tip:** Keep the returned factory object. The devtools and several helpers take it as their `source`.

Next: [Resources and layouts](./guides/resource-layouts.md).

## Companion package versions

The core package installs its own internal packages for you: validators,
composables and the inspection core. Do not install those directly. These
companion packages you choose yourself, and each guide tells you when to add one.

The table lists versions from `packages/*/package.json` at the v4.0.0 tag
(commit `b68f12045758ea26e7df75d3c79c8c2b886b4ace`). They are the set built from
that commit. Other combinations may work, but only this set is verified by the
repository's own workspace build and tests.

| You need                                                  | Package                                                | Version | Peer requirements        |
| --------------------------------------------------------- | ------------------------------------------------------ | ------- | ------------------------ |
| Core library                                              | `@jfdevelops/react-layout`                             | 4.0.0   | `react`, `react-dom` ≥18 |
| React node and element schemas for Zod                    | `@jfdevelops/react-layout-adapter-zod`                 | 1.0.0   | `zod` ^4.0.0             |
| …for Valibot                                              | `@jfdevelops/react-layout-adapter-valibot`             | 1.0.0   | `valibot` ^1.0.0         |
| …for ArkType                                              | `@jfdevelops/react-layout-adapter-arktype`             | 1.0.0   | `arktype` ^2.2.8         |
| …for Effect                                               | `@jfdevelops/react-layout-adapter-effect`              | 1.0.0   | `effect` ^4.0.0          |
| …for another Standard Schema library                      | `@jfdevelops/react-layout-adapters`                    | 1.0.0   | `react` ≥18              |
| Breadcrumb and tabs presets                               | `@jfdevelops/react-layout-composable-navigation`       | 0.1.2   | `react`, `react-dom` ≥18 |
| Header and meta presets                                   | `@jfdevelops/react-layout-composable-copy`             | 0.1.2   | `react`, `react-dom` ≥18 |
| Actions preset                                            | `@jfdevelops/react-layout-composable-actions`          | 0.2.1   | `react`, `react-dom` ≥18 |
| Access preset                                             | `@jfdevelops/react-layout-composable-access`           | 0.1.2   | `react`, `react-dom` ≥18 |
| Breadcrumb re-export kept for older code                  | `@jfdevelops/react-layout-composable-breadcrumb`       | 1.1.2   | `react`, `react-dom` ≥18 |
| Floating or embedded layout inspector                     | `@jfdevelops/react-layout-devtools-react`              | 1.0.0   | `react`, `react-dom` ≥18 |
| Vite plugin for source links and state previews           | `@jfdevelops/react-layout-devtools-vite`               | 1.0.0   | `vite` ^6, ^7 or ^8      |

Resolved by npm for core's own published `dependencies` at 4.0.0:
`@jfdevelops/react-layout-composables` 1.2.1, `@jfdevelops/react-layout-validator` 1.2.0,
`@jfdevelops/react-layout-devtools-core` 1.0.0, `@jfdevelops/react-layout-adapter-arktype`
1.0.0, `@jfdevelops/create-error` 0.2.1 and `arktype` 2.2.8.

## Agent skill

The package ships a `build-react-layouts` skill for coding agents. After
installing the package, add it to the agents in your project:

```sh
npx skills add ./node_modules/@jfdevelops/react-layout/skills/build-react-layouts
npx skills list
```

The command prompts for which agents to target and whether to copy or link the
skill. Installing the package alone does not activate the skill, because agents
read different skill directories. A consuming project can opt into synchronizing
dependency-provided skills after install with
[`skills-npm`](https://github.com/antfu/skills-npm) and a `prepare` script of
`skills-npm --yes`.
