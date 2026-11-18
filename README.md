# @jfdevelops/react-layout

A React library for building resource-based page layouts. Define a shared layout once, then create typed page components for each resource in your app — useful for admin dashboards, CRUD apps, and any UI where many pages share the same shell.

## What it does

- **Define layouts by resource** — group pages under resources like `users`, `settings`, or nested sub-resources.
- **Reuse layout structure** — composable slots (e.g. `Layout`, `Title`, `Content`) keep markup consistent across pages.
- **Type-safe props** — validate and infer layout props with Standard Schema libraries and native React adapters.

## Install

```bash
pnpm add @jfdevelops/react-layout zod
```

Zod is only an example. Any synchronous Standard Schema library works.

## Quick example

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

Created pages provide their resource to descendants through the definition's `useResource`
hook. See [`examples/basic-example`](./examples/basic-example) for a full working app.

## Documentation

The docs are versioned by major. Start with the version you use.

| Version | Docs |
| --- | --- |
| v4 (current) | [Overview](./docs/v4/index.md), [Getting started](./docs/v4/getting-started.md), [API reference](./docs/v4/reference/api.md) |
| v3 | [Overview](./docs/v3/index.md) |
| v2 | [Overview](./docs/v2/index.md) |
| v1 | [Overview](./docs/v1/index.md) |
| v0 (legacy, unstable) | [Overview](./docs/v0/index.md) |

Popular v4 guides:

- [Resources and layouts](./docs/v4/guides/resource-layouts.md): resources, naming, namespaces, shells
- [Props and validation](./docs/v4/guides/props-and-validation.md): Standard Schema and React values
- [Render states](./docs/v4/guides/render-states.md): Loading, Error, shared and derived states
- [Composables and presets](./docs/v4/guides/composables-and-presets.md)
- [Route components and renderers](./docs/v4/guides/route-components.md)
- [Reusable helpers](./docs/v4/guides/reusable-helpers.md)
- [Lazy loading](./docs/v4/guides/lazy-loading.md)
- [Hosted surfaces](./docs/v4/guides/hosted-surfaces.md)
- [Develop and debug](./docs/v4/guides/develop-and-debug.md)
- [Migrating from v3](./docs/v4/migration.md)

Optional packages for schema adapters, preset composables and devtools are covered inside
these guides. Their versions are in the
[compatibility table](./docs/v4/getting-started.md#companion-package-versions).

## Workspace

| Path                     | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `packages/core`          | `@jfdevelops/react-layout`, the published library                |
| `packages/*`             | Companion packages and the internal packages core installs       |
| `examples/basic-example` | Demo app showing resource layouts in action                      |
| `docs`                   | Versioned docs, their manifest and maintainer notes              |

Contributing: `pnpm install`, then `pnpm build` and `pnpm test`. Tooling, lint and format
notes are in [docs/maintainers/development.md](./docs/maintainers/development.md).

## Agent skill

The package ships a `build-react-layouts` skill for coding agents. Installation steps are in
[Getting started](./docs/v4/getting-started.md#agent-skill).
