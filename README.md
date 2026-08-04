# @jfdevelops/react-layout

A React library for building resource-based page layouts. Define a shared layout once, then create typed page components for each resource in your app — useful for admin dashboards, CRUD apps, and any UI where many pages share the same shell.

## What it does

- **Define layouts by resource** — group pages under resources like `users`, `settings`, or nested sub-resources.
- **Reuse layout structure** — composable slots (e.g. `Layout`, `Title`, `Content`) keep markup consistent across pages.
- **Type-safe props** — validate and infer layout props with a small built-in prop builder.

## Quick example

```tsx
import { createProp, defineResourceLayout } from '@jfdevelops/react-layout';

const { createResourceLayout } = defineResourceLayout({
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
        <composables.Title>{props.title}</composables.Title>
        <p>{props.description}</p>
      </composables.Layout>
    ),
  },
});

const UsersPage = createResourceLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
  description: 'Manage users.',
});
```

See [`examples/basic-example`](./examples/basic-example) for a full working app.

## Workspace

| Path | Description |
| --- | --- |
| `packages/core` | `@jfdevelops/react-layout` — the published library |
| `examples/basic-example` | Demo app showing resource layouts in action |

## Development

**Requirements:** Node `^20.19.0 \|\| >=22.12.0`, pnpm `10.28.1`, React `>=18`

```bash
pnpm install
pnpm dev              # library dev server
pnpm dev:basic-example # run the example app
pnpm build            # build the library
pnpm test             # run tests
```

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
