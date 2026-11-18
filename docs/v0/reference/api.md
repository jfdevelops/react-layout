---
title: API reference
description: The runtime exports of the last 0.x release, each with a classification.
order: 30
---

This page lists the runtime exports of `@jfdevelops/react-layout` `0.25.0`, read from
`packages/core/src/index.ts` at that tag (commit `185598a15d362035ac59a5429404642d9c52abb4`). It
also lists the factory members. Nothing here was compiled. Other `0.x` releases differ.

## How exports are classified

| Class          | Meaning                                                             |
| -------------- | ------------------------------------------------------------------- |
| **Primary**    | An entry point the snapshot guide uses.                             |
| **Utility**    | A small exported helper. Public, but not covered by the guide.      |
| **Authoring**  | Low-level plumbing for people who write presets or integrations.    |
| **Error**      | An error class.                                                     |

Types are public too (129 type exports from the core entry).

## Definition functions

| Export                        | Class   | Use it to                                                 |
| ----------------------------- | ------- | --------------------------------------------------------- |
| `defineResourceLayout`        | Primary | Define resources, options and a layout in one call.       |
| `createDefinedResourceLayout` | Primary | Start the chained builder: `('users').defineOptions(...)`. |
| `createProp`                  | Primary | Describe a prop with the built-in builder.                |

`defineResourceLayout(options)` returns `createResourceLayout`, `createResourceConfig`,
`createResourceLinks`, `resources`, `ResourceProvider` and `useResource`, with statics
`forResources`, `defineResources` and `withLayout`.

## Props exports

| Export                        | Class   | What it does                                    |
| ----------------------------- | ------- | ----------------------------------------------- |
| `createPrimitivePropBuilder`  | Utility | Builds primitive `createProp` builders.         |
| `isPropDefinitionShape`       | Utility | Tests for a prop definition shape.              |
| `validateProps`               | Utility | Validates prop definitions against values.      |
| `resolvePropDefinitionValues` | Utility | Resolves validated values from definitions.     |

## Composable exports

| Export                           | Class     |
| -------------------------------- | --------- |
| `defineComposableComponent`      | Primary   |
| `createComposableComponent`      | Authoring |
| `createLayoutComposableFactory`  | Authoring |
| `resolveLayoutComposables`       | Authoring |
| `collectComposablePresetEntries` | Authoring |
| `resolveComposablePresetProps`   | Authoring |
| `LayoutComposablePresetProvider` | Authoring |
| `makeComposable`                 | Authoring |

## Resource utilities

| Export                | Class   | What it does                                                    |
| --------------------- | ------- | --------------------------------------------------------------- |
| `normalizeResource`   | Utility | Normalizes one resource declaration.                            |
| `normalizeResources`  | Utility | Normalizes an array of resource declarations.                   |
| `toResourceEnum`      | Utility | Turns normalized resources into a non-empty array of keys.      |
| `pick`                | Utility | Copies the listed keys of an object into a new object.          |

## Errors

| Error                          | Raised when                                                |
| ------------------------------ | ---------------------------------------------------------- |
| `ReactLayoutError`             | Base class for structured library errors.                  |
| `LayoutConfigurationError`     | A definition is invalid.                                   |
| `InvalidConfigError`           | A resource config is malformed.                            |
| `InvalidPathError`             | A path does not exist.                                     |
| `InvalidResourceError`         | A resource is not declared.                                |
| `InvalidSubResourceError`      | A sub-resource is not declared under its parent.           |
| `InvalidComponentError`        | A component slot is not configured.                        |
| `MissingPathVariableError`     | A path variable was not supplied.                          |
| `MissingResourceProviderError` | `useResource` ran outside a provider.                      |
| `PropError`                    | A prop failed validation.                                  |
| `ResourceModuleLoadError`      | A dynamic import failed. Extends `Error`.                  |
| `ResourceRenderError`          | An exception was thrown while rendering a state. Extends `Error`. |

## Companion exports

`@jfdevelops/react-layout-composable-breadcrumb` 0.2.8 exports `createBreadcrumbComposable`. The
composables and validator packages are installed with core.

## Next steps

- [Final snapshot](../final-snapshot.md)
- [Migrating from v0 to v1](../../v1/migration.md)
