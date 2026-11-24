---
title: Overview
description: What the library includes, what changed from the previous major, and where to start.
order: 10
---

React Layout is a React library for resource-based page layouts. You define the shared structure of your pages once, then create a typed component for each resource.

> **Note:** The examples in this section are adapted from the package's own documentation and tests for its last release. They were not compiled. The repository does not promise fixes to this major.

## Core ideas

| Term         | Meaning                                                     | Example                 |
| ------------ | ----------------------------------------------------------- | ----------------------- |
| Resource     | A page or section of your app, named by a string.           | `users`, `users.detail` |
| Option       | A typed value a page supplies when it is created.           | `title: 'Users'`        |
| Layout       | The shared render function that turns options into markup.  | `layout.render`         |
| Composable   | A named slot component that keeps shared markup consistent. | `composables.Title`     |
| Render state | A variant of a page such as `Loading` or `Error`.           | `<Users.Loading />`     |

In v1, props are described with the built-in `createProp` builder. Standard Schema support arrived in 2.6.0.

## What changed

v1.0.0 replaced the chained `createDefinedResourceLayout` builder with a single configuration object. Compared with the final v0 release:

1. **`createDefinedResourceLayout` takes one configuration object.** The chained `createDefinedResourceLayout('users').defineOptions(...)` form is gone.
2. **Bound layout definitions are flattened.** The bound `defineResourceLayout` takes `{ render }` directly, not `{ layout: { render } }`.
3. **The `resources` accessor is normalized.** `resources()` returns normalized definitions and `resources.raw()` returns the original declarations.
4. **`createResourceConfig.forResource` fragments** can be spread into a config.

Minor releases then added:

| Version | Added                                                                                       |
| ------- | ------------------------------------------------------------------------------------------- |
| 1.0.1   | Typed callback shorthand for `createRenderState` and state-name suggestions.                |
| 1.1.0   | `asComposable` on state builders, and the `namespace` option.                               |
| 1.2.0   | `createRenderState.fromState`.                                                              |
| 1.3.0   | The graph inspector, shared prop contracts and reusable naming defaults.                    |
| 1.4.0   | The Vite plugin, source locations and `defineLayoutPreview`.                                |
| 1.5.0   | `required` and `suppliedVia` in `props.include`.                                            |
| 1.6.0   | Optional names, `defineLayoutName.defineParts`, `strict` and part validation.               |
| 1.6.1   | `defineLayoutName` and `namingFn` require a single configuration object.                    |

The [migration guide](./migration.md) covers upgrading from v0.

## Next steps

- [Standard Schema](./standard-schema.md): schema integration and validation support.
- [Runtime errors](./errors/layout-configuration.md): configuration failures and how to resolve them; the Errors section lists every error for this release.


| If you want to…                              | Read                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Install the packages and render a first page | [Getting started](./getting-started.md)                        |
| Understand resources, options and naming     | [Resources and layouts](./guides/resource-layouts.md)          |
| Validate props                               | [Props and validation](./guides/props-and-validation.md)       |
| Add Loading, Error and custom states         | [Render states](./guides/render-states.md)                     |
| Share slots                                  | [Composables](./guides/composables-and-presets.md)             |
| Hand components to a router                  | [Route components](./guides/route-components.md)               |
| Split bundles                                | [Lazy loading](./guides/lazy-loading.md)                       |
| Inspect a running layout tree                | [Develop and debug](./guides/develop-and-debug.md)             |
| Look up an export                            | [API reference](./reference/api.md)                            |
| Fix an error message                         | [Troubleshooting](./troubleshooting.md)                        |

Other majors: [v4](../v4/overview.md), [v3](../v3/index.md), [v2](../v2/index.md), [v0](../v0/index.md).
