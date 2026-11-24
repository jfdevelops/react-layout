---
title: Migrating from v1 to v2
description: Update lazy error handling, replace removed include settings, and adopt the 2.x additions.
order: 140
---

v2.0.0 reworked lazy loading and removed two deprecated settings. Most v1 code that does not use lazy loading or the old include spellings needs no change.

In this guide you will:

- rename removed `props.include` settings
- stop reading the render context's `resource`
- adjust lazy error handling and lazy proxy access

Source: the 2.0.0 section of the core changelog and the 2.7.0 `docs/` pages.

## Upgrade the package

```npm
npm i @jfdevelops/react-layout@2.7.0
```

```pnpm
pnpm add @jfdevelops/react-layout@2.7.0
```

```yarn
yarn add @jfdevelops/react-layout@2.7.0
```

```bun
bun add @jfdevelops/react-layout@2.7.0
```

The inspector and Vite plugin ship as separate packages. The versions that were built with v2 are in the [compatibility table](./getting-started.md#companion-package-versions).

## 1. Rename removed include settings

`visibility` and `passthrough` were deprecated in 1.5.0 and removed in 2.0.0. Using them now produces a configuration error.

| v1                                  | v2                      |
| ----------------------------------- | ----------------------- |
| `visibility: 'required'`            | `required: true`        |
| `visibility: 'optional'`            | `required: false`       |
| `passthrough: 'component'`          | `suppliedVia: 'component'` |
| `passthrough: 'config'`             | `suppliedVia: 'config'` |

The `true` and `'optional'` shorthand forms remain supported.

## 2. Read `resources.current`

The layout render context no longer has `resource`. Use `context.resources.current`. Naming callbacks and resource props keep their `resource` field.

## 3. Lazy loading changes

- **Typed errors only.** A lazy `Error` now handles only the closed `LazyResourceError` union (`resourceModuleLoad`, `lazyResourceModuleShape`, `lazyResourceStateNotFound`). Ordinary page render errors propagate to your route's error boundary. Add an error boundary where you relied on the lazy `Error` to catch render exceptions.
- **Capitalized compound states.** Access states on a lazy proxy as `Page.Loading` and `Page.NotFound`. Lowercase names and React or Promise statics no longer synthesize state components, and awaiting a lazy component no longer treats it as a thenable.
- **Defaults get the resource path union.** Lazy defaults receive the factory's resource path union in `resource`, and errors are discriminated by `code`.
- **Unified loader.** Lazy resources, render states and scoped components share a cached loader with `preload()`, `status`, fallback overrides and retry, and report status to the inspector.
- **Scoped shells accept `lazy`.** Put content in a lazy module to avoid circular imports.
- **`createRenderState.lazy(load)`** still works and now also accepts `{ load, fallback }`.

## 4. New in 2.x

| Version | Added                                                                 |
| ------- | --------------------------------------------------------------------- |
| 2.0.0   | `makeComposable` on `createComponent(...).asHOF()(resource)` pages.   |
| 2.1.0   | `state` in render contexts, `forStates`, `defineLazyDefaults.createRenderState`. |
| 2.3.0   | Default `children` and `createReusable`.                              |
| 2.4.0   | Typed selectors in reusable helpers.                                  |
| 2.5.0   | `resources.single()`.                                                 |
| 2.6.0   | Standard Schema props, the React adapters, and the `createProp` deprecation. |
| 2.7.0   | Hosted surfaces and `defineResourceSurfaces`.                         |

`defineLazyDefaults.createErrorComponent` is still available in v2 as a deprecated alias for `createRenderState({ state: 'Error', render })`. It wraps the callback to provide composables and no longer returns the original callback by identity. v3 removed it.

## Checklist

1. Replace `visibility` and `passthrough`.
2. Replace `context.resource` with `context.resources.current`.
3. Add an error boundary around lazy routes.
4. Capitalize compound state access on lazy components.
5. Optionally start moving props to Standard Schema (2.6.0 and later).

## Next steps

- [Lazy loading](./guides/lazy-loading.md)
- [Props and validation](./guides/props-and-validation.md)
- Next major: [v2 to v3](../v3/migration.md)
