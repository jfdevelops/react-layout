---
title: Overview
description: What the library includes, what changed from the previous major, and where to start.
order: 10
---

React Layout is a React library for resource-based page layouts. You define the
shared structure of your pages once, then create a typed component for each
resource.

> **Note:** The examples in this section are adapted from the package's own documentation
> and tests for its last release. They were not compiled. The repository does not promise
> fixes to this major.

## Core ideas

| Term         | Meaning                                                     | Example                 |
| ------------ | ----------------------------------------------------------- | ----------------------- |
| Resource     | A page or section of your app, named by a string.           | `users`, `users.detail` |
| Option       | A typed value a page supplies when it is created.           | `title: 'Users'`        |
| Layout       | The shared render function that turns options into markup.  | `layout.render`         |
| Composable   | A named slot component that keeps shared markup consistent. | `composables.Title`     |
| Render state | A variant of a page such as `Loading` or `Error`.           | `<Users.Loading />`     |

## What changed

v3.0.0 was a coordinated major release of every package. Compared with v2:

1. **Props use Standard Schema only.** `createProp` and the legacy prop builders
   were removed. Use Zod, Valibot, ArkType, Effect or any Standard Schema library,
   plus the React adapters.
2. **React components get optional `children` by default**, including the prop
   schemas retained for reuse.
3. **Public generic types are cheaper to check**, and most large builder types now
   declare invariant parameters.
4. **A private `@jfdevelops/react-layout-internals` package** holds shared types.
   Do not import it.
5. **Smaller API cleanups:** `defineLazyDefaults.createErrorComponent` was removed;
   `RenderStateContext` reordered its type parameters; `Show` no longer preserves
   call signatures (use `ShowCallable`).

Minor releases then added:

| Version | Added                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- |
| 3.1.0   | Shared resource renderers with inferred parameters.                                      |
| 3.2.0   | Composable `defineContext`, validator functions as props, `rename` and `extend`.         |
| 3.3.0   | `getSchema(path)` and the `Name` definition alias on composable factories.               |

The [migration guide](./migration.md) covers upgrading from v2.

## Next steps

- [Standard Schema](./standard-schema.md): schema integration and validation support.
- [Runtime errors](./errors/layout-configuration.md): configuration failures and how to resolve them; the Errors section lists every error for this release.


| If you want to…                              | Read                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Install the packages and render a first page | [Getting started](./getting-started.md)                        |
| Understand resources, options and naming     | [Resources and layouts](./guides/resource-layouts.md)          |
| Validate props and use React node schemas    | [Props and validation](./guides/props-and-validation.md)       |
| Add Loading, Error and custom states         | [Render states](./guides/render-states.md)                     |
| Share slots and use preset composables       | [Composables and presets](./guides/composables-and-presets.md) |
| Hand components to a router                  | [Route components and renderers](./guides/route-components.md) |
| Write typed helper functions                 | [Reusable helpers](./guides/reusable-helpers.md)               |
| Split bundles                                | [Lazy loading](./guides/lazy-loading.md)                       |
| Add panes and overlays                       | [Hosted surfaces](./guides/hosted-surfaces.md)                 |
| Inspect a running layout tree                | [Develop and debug](./guides/develop-and-debug.md)             |
| Look up an export                            | [API reference](./reference/api.md)                            |
| Fix an error message                         | [Troubleshooting](./troubleshooting.md)                        |

Other majors: [v4](../v4/overview.md), [v2](../v2/index.md), [v1](../v1/index.md),
[v0](../v0/index.md).
