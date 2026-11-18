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

v2.0.0 reworked lazy loading and removed two deprecated settings. Compared with v1:

1. **Lazy loading is unified.** Lazy resources, render states and scoped components
   share one cached loader with `preload()`, `status`, fallbacks and retry.
2. **Lazy errors are narrower.** A lazy `Error` handles only the closed
   `LazyResourceError` union. Ordinary render errors go to your route's error boundary.
3. **Compound states on a lazy proxy need a capital letter.**
4. **`visibility` and `passthrough` were removed** from `props.include`. Use `required`
   and `suppliedVia`.
5. **The layout render context's `resource` was removed.** Read `resources.current`.

Minor releases added:

| Version | Added                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| 2.1.0   | The current `state` in render contexts, `forStates`, and `defineLazyDefaults.createRenderState`. |
| 2.2.0   | Composable outlines and page highlighting in the inspector.                                    |
| 2.3.0   | Default `children`, and `createReusable`.                                                      |
| 2.4.0   | Typed selectors in reusable helpers.                                                           |
| 2.5.0   | `resources.single()` in reusable helpers.                                                      |
| 2.6.0   | Standard Schema props and the React adapters. `createProp` was deprecated.                     |
| 2.7.0   | Hosted surface families and `defineResourceSurfaces`.                                          |

The [migration guide](./migration.md) covers upgrading from v1.

## Next steps

| If you want to…                              | Read                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Install the packages and render a first page | [Getting started](./getting-started.md)                        |
| Understand resources, options and naming     | [Resources and layouts](./guides/resource-layouts.md)          |
| Validate props                               | [Props and validation](./guides/props-and-validation.md)       |
| Add Loading, Error and custom states         | [Render states](./guides/render-states.md)                     |
| Share slots                                  | [Composables](./guides/composables-and-presets.md)             |
| Hand components to a router                  | [Route components](./guides/route-components.md)               |
| Write typed helper functions                 | [Reusable helpers](./guides/reusable-helpers.md)               |
| Split bundles                                | [Lazy loading](./guides/lazy-loading.md)                       |
| Add panes and overlays                       | [Hosted surfaces](./guides/hosted-surfaces.md)                 |
| Inspect a running layout tree                | [Develop and debug](./guides/develop-and-debug.md)             |
| Look up an export                            | [API reference](./reference/api.md)                            |
| Fix an error message                         | [Troubleshooting](./troubleshooting.md)                        |

Other majors: [v4](../v4/index.md), [v3](../v3/index.md), [v1](../v1/index.md),
[v0](../v0/index.md).
