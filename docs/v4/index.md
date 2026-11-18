---
title: Overview
description: What the library is, what is new in this major, and where to start.
order: 10
---

React Layout is a React library for resource-based page layouts. You define the
shared structure of your pages once, then create a typed component for each
resource: `users`, `settings`, `containers.$containerId` and so on. It suits
admin dashboards, CRUD apps and any product where many pages share a shell.

## Core ideas

Five terms appear on every page. Learn them once here.

| Term | Meaning | Example |
| ---- | ------- | ------- |
| Resource | A page or section of your app, named by a string. | `users`, `users.detail` |
| Option | A typed value a page supplies when it is created. | `title: 'Users'` |
| Layout | The shared render function that turns options into markup. | `layout.render` |
| Composable | A named slot component that keeps shared markup consistent. | `composables.Title` |
| Render state | A variant of a page such as `Loading` or `Error`. | `<Users.Loading />` |

## What you get

- **Layouts defined by resource.** Group pages under resources and nested
  sub-resources, then create a page component per resource that already knows
  its resource name.
- **Shared structure through composables.** Named slots such as `Layout`,
  `Title` and `Content` keep markup consistent, and ready-made presets supply
  both props and markup for common slots.
- **Typed props from Standard Schema.** Props are described with Zod, Valibot,
  ArkType, Effect or any other synchronous Standard Schema library. React node
  and element schemas come from small adapter packages.
- **Render states.** `default`, `Loading`, `Error`, `NotFound` and your own
  states are compound components with independent props.
- **Lazy loading, hosted surfaces, shared renderers.** Code-split whole pages or
  single states, attach panes and overlays to a host resource, and share one
  renderer across routes.
- **Optional inspection.** A devtools inspector and a Vite plugin show the
  layout graph while you develop.

## What is new

v4 has two breaking changes, both in the shared renderer API, and one
additive change built on them. Everything else in the v3 API carries over
unchanged.

1. Renderer factories take one options object, `factory({ component, params, props })`,
   instead of positional arguments. `component: '*'` returns every configured component slot.
2. The `displayName` callback receives a typed path object. Read `path.value`
   for the string, and use `path.is(prefix)` and `path.capitalize()` to work with it.
3. Selections with configured descendants gain `forResource(relativePath)`.

The [migration guide](./migration.md) lists each change with before and after code.

## Next steps

Pick the task that matches what you are doing.

| If you want to…                                  | Read                                                           |
| ------------------------------------------------ | -------------------------------------------------------------- |
| Install the packages and render a first page     | [Getting started](./getting-started.md)                        |
| Understand resources, options and naming         | [Resources and layouts](./guides/resource-layouts.md)          |
| Validate props and use React node schemas        | [Props and validation](./guides/props-and-validation.md)       |
| Add Loading, Error and custom states             | [Render states](./guides/render-states.md)                     |
| Share slots and use preset composables           | [Composables and presets](./guides/composables-and-presets.md) |
| Hand components to a router                      | [Route components and renderers](./guides/route-components.md) |
| Write typed helper functions from layout options | [Reusable helpers](./guides/reusable-helpers.md)               |
| Split bundles                                    | [Lazy loading](./guides/lazy-loading.md)                       |
| Add panes and overlays                           | [Hosted surfaces](./guides/hosted-surfaces.md)                 |
| Inspect a running layout tree                    | [Develop and debug](./guides/develop-and-debug.md)             |
| Look up an export                                | [API reference](./reference/api.md)                            |
| Fix an error message                             | [Troubleshooting](./troubleshooting.md)                        |

## Companion packages

Some capabilities live in separate npm packages: schema adapters for React
values, preset composables, and development tooling. They are not separate
products. Each guide above tells you when you need one, how to install it, and
which versions were released alongside v4. The
[getting started page](./getting-started.md#companion-package-versions) has the
full compatibility table.

## Other majors

Earlier majors stay available: [v3](../v3/index.md), [v2](../v2/index.md),
[v1](../v1/index.md) and the unstable [v0](../v0/index.md) line.
