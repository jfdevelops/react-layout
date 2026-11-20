---
title: Overview
description: The unstable 0.x line. Read this before using any 0.x release.
order: 10
---

`@jfdevelops/react-layout` was published as `0.x` from `0.1.1` to `0.25.0`. This
section is a **legacy snapshot**, not a version-by-version manual.

> **Warning:** Do not treat `0.x` as stable. Under semver, any `0.x` minor may break.
> This project used that freedom often. The docs here describe one release, `0.25.0`,
> and do not promise accuracy for any other `0.x` version.

## What this section covers

- [The final snapshot](./final-snapshot.md): how `0.25.0` is used, from its own README and
  changelog.
- [API reference for 0.25.0](./reference/api.md): its runtime exports, classified.

It does **not** cover each `0.x` minor. There are 42 published `0.x` versions, and no page
is promised for the others. For a specific version, read that tag's source and
`packages/core/CHANGELOG.md` in the repository.

## Why 0.x changed so much

The package changed shape quickly between 2026-06-02 and 2026-10-21. Examples recorded in
the core changelog:

| Release  | Change                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| `0.4.0`  | Validators, composables and the breadcrumb preset were split into separate packages.            |
| `0.13.0` | Per-resource entries moved under a `resources` key. An explicit type argument on scoped components was dropped. |
| `0.18.0` | The `subResources` wrapper in resource configs was removed. Nested `subResource` params became `{ value, subResource }`. A typed error hierarchy was added. |
| `0.19.0` | `resources.current` replaced the render context's `resource`, which was deprecated.            |
| `0.20.0` | `resources.pick` and `resources.omit` began to require at least one key and return a selection thunk. |
| `0.22.0` | Grouped resource-link ids became deterministic instead of random.                              |
| `0.25.0` | Render states and lazy loading were added.                                                      |

`1.0.0` then replaced the chained `createDefinedResourceLayout` builder. See
[Migrating from v0 to v1](../v1/migration.md).

## Which package versions go with 0.25.0

At the `0.25.0` tag (commit `185598a15d362035ac59a5429404642d9c52abb4`), the repository's
`packages/*/package.json` carried these versions. npm resolved core's published
`dependencies` to the same set.

| Package                                          | Version |
| ------------------------------------------------ | ------- |
| `@jfdevelops/react-layout`                       | 0.25.0  |
| `@jfdevelops/react-layout-composables` (internal dependency) | 0.2.8 |
| `@jfdevelops/react-layout-validator` (internal dependency)   | 0.3.0 |
| `@jfdevelops/react-layout-composable-breadcrumb` | 0.2.8   |

Core also depended on `@jfdevelops/create-error` 0.2.0 and `arktype` 2.2.8. The inspector, the
Vite plugin and the schema adapters did not exist yet.

## Moving off v0

Upgrade to [v1](../v1/index.md) and then onward one major at a time. Each version's migration
page lists the changes between adjacent majors.
