---
title: API reference
description: Every runtime export and factory member, plus companion exports used with them, each with a classification.
order: 120
---

This page lists what you can import and what the factories return in
`@jfdevelops/react-layout` 1.6.1. The export lists were read from
`packages/core/src/index.ts` and the companion `src/index.ts` files at the v1.6.1 tag.
Examples and statements were not compiled against the package.

## How exports are classified

| Class          | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Primary**    | An entry point the guides teach. Start here.                         |
| **Supporting** | A public helper used alongside primary APIs.                         |
| **Utility**    | A small exported helper. Public, but no guide teaches it.            |
| **Authoring**  | Low-level plumbing for people who write presets or integrations.     |
| **Error**      | An error class.                                                      |
| **Deprecated** | Still works in v1, removed later, with a replacement named.          |

Types are public too (156 type exports from the core entry). Import them with
`import type`.

## Definition functions

| Export                        | Class   | Use it to                                                              | Guide                                                  |
| ----------------------------- | ------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `defineResourceLayout`        | Primary | Define resources, options and a layout in one call.                    | [Resources and layouts](../guides/resource-layouts.md) |
| `createDefinedResourceLayout` | Primary | Bind resources, options and composables once, then split across files. | [Getting started](../getting-started.md)               |
| `defineLayoutName`            | Primary | Build a reusable naming convention.                                    | [Resources and layouts](../guides/resource-layouts.md#naming) |
| `defineLayoutPreview`         | Primary | Supply typed fixture props for a state preview (1.4.0).                | [Develop and debug](../guides/develop-and-debug.md)    |

`defineResourceLayout(options)` returns `createResourceLayout` (with `.forResource(...)`
and `.forResources(...)`), `createResourceConfig`, `createResourceLinks`, `resources`,
`ResourceProvider` and `useResource`. Statics: `forResources`, `defineResources`,
`withLayout` (which also returns `Shell`).

`createDefinedResourceLayout(options)` returns `defineResourceLayout` (bound, with `.lazy`),
`createRenderState` (`.defer`, `.lazy`, `.fromState`), `defineLazyDefaults` and `resources`.

## Props and validation exports

| Export                        | Class      | Use it to                                                     |
| ----------------------------- | ---------- | ------------------------------------------------------------- |
| `createProp`                  | Primary    | Describe a prop with the built-in builder.                    |
| `createPrimitivePropBuilder`  | Utility    | Build primitive `createProp` builders.                        |
| `isPropDefinitionShape`       | Utility    | Test for a prop definition shape.                             |
| `validateProps`               | Utility    | Validate prop definitions against values.                     |
| `resolvePropDefinitionValues` | Utility    | Resolve validated values from definitions.                    |

`createProp` was deprecated in 2.6.0 and removed in v3.

## Composable exports

| Export                           | Class     | Use it to                                              |
| -------------------------------- | --------- | ------------------------------------------------------ |
| `defineComposableComponent`      | Primary   | Define a composable with typed props.                  |
| `createComposableComponent`      | Authoring | Create one composable component.                       |
| `createLayoutComposableFactory`  | Authoring | Build the `create` function a layout receives.         |
| `resolveLayoutComposables`       | Authoring | Resolve a layout's composables callback.               |
| `collectComposablePresetEntries` | Authoring | Collect preset metadata from composables.              |
| `resolveComposablePresetProps`   | Authoring | Resolve preset prop definitions.                       |
| `LayoutComposablePresetProvider` | Authoring | Provide preset values to composables.                  |
| `makeComposable`                 | Authoring | Create a composable resource layout.                   |

## Resource utilities

| Export                         | Class   | What it does                                                    |
| ------------------------------ | ------- | --------------------------------------------------------------- |
| `normalizeResource`            | Utility | Normalize one resource declaration to a tree with `value`.      |
| `normalizeResources`           | Utility | Normalize an array of resource declarations.                    |
| `normalizeResourceDefinitions` | Utility | Normalize declarations, keeping tuple positions and literals.   |
| `toResourceEnum`               | Utility | Turn normalized resources into a non-empty array of keys.       |
| `pick`                         | Utility | Copy the listed keys of an object into a new object.            |

## Errors

| Error                          | Raised when                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| `ReactLayoutError`             | Base class for structured library errors.                            |
| `LayoutConfigurationError`     | A definition is invalid.                                             |
| `InvalidConfigError`           | A resource config is malformed.                                      |
| `InvalidPathError`             | A path does not exist.                                               |
| `InvalidResourceError`         | A resource is not declared.                                          |
| `InvalidSubResourceError`      | A sub-resource is not declared under its parent.                     |
| `InvalidComponentError`        | A component slot is not configured.                                  |
| `MissingPathVariableError`     | A path variable was not supplied.                                    |
| `MissingResourceProviderError` | `useResource` ran outside a provider.                                |
| `InvalidPartError`             | A naming convention received an undeclared part key (1.6.0).         |
| `InvalidPartTypeError`         | A naming part had the wrong kind of value (1.6.0).                   |
| `PropError`                    | A prop failed validation.                                            |
| `ResourceModuleLoadError`      | A dynamic import failed. Extends `Error`.                            |
| `ResourceRenderError`          | An exception was thrown while rendering a named state. Extends `Error`. |

## Deprecated in v1

| Deprecated                                      | Use instead                      |
| ----------------------------------------------- | -------------------------------- |
| `props.include` `visibility` and `passthrough`  | `required` and `suppliedVia`     |
| Layout render context `resource`                | `resources.current`              |

Both were removed in 2.0.0.

## Companion package exports

| Export                                                                      | Package suffix          | Use it to                                    |
| --------------------------------------------------------------------------- | ----------------------- | -------------------------------------------- |
| `createBreadcrumbComposable`                                                | `composable-breadcrumb` | Add a `Breadcrumb` slot with `segments`.     |
| `ReactLayoutDevtools`, `ReactLayoutDevtoolsContent`                         | `devtools-react`        | Show the floating or embedded inspector.     |
| `ReactLayoutDevtoolsProvider`, `…Toolbar`, `…Explorer`, `…Inspector`, `…Footer`, `…Workspace`, `useReactLayoutDevtools` | `devtools-react` | Compose a custom inspector. |
| `reactLayoutDevtools`                                                       | `devtools-vite`         | Vite plugin for source links and previews.   |

Packages are named `@jfdevelops/react-layout-<suffix>`.

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Migration from v0](../migration.md)
