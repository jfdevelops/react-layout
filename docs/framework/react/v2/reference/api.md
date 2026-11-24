---
title: API reference
description: Every runtime export and factory member, plus companion exports used with them, each with a classification.
order: 120
---

This page lists what you can import and what the factories return in `@jfdevelops/react-layout` 2.7.0. The export lists were read from `packages/core/src/index.ts` and the companion `src/index.ts` files at the v2.7.0 tag. Examples and statements were not compiled against the package.

## How exports are classified

| Class          | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Primary**    | An entry point the guides teach. Start here.                         |
| **Supporting** | A public helper used alongside primary APIs.                         |
| **Utility**    | A small exported helper. Public, but no guide teaches it.            |
| **Authoring**  | Low-level plumbing for people who write presets or integrations.     |
| **Error**      | An error class.                                                      |
| **Deprecated** | Still works in v2, removed later, with a replacement named.          |

Types are public too (186 type exports from the core entry). Import them with `import type`.

## Definition functions

| Export                        | Class   | Use it to                                                              | Guide                                                  |
| ----------------------------- | ------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `defineResourceLayout`        | Primary | Define resources, options and a layout in one call.                    | [Resources and layouts](../guides/resource-layouts.md) |
| `createDefinedResourceLayout` | Primary | Bind resources, options and composables once, then split across files. | [Getting started](../getting-started.md)               |
| `defineResourceSurfaces`      | Primary | Declare a root family and hosted families in one call (2.7.0).         | [Hosted surfaces](../guides/hosted-surfaces.md)        |
| `defineLayoutName`            | Primary | Build a reusable naming convention.                                    | [Resources and layouts](../guides/resource-layouts.md#naming) |
| `defineLayoutPreview`         | Primary | Supply typed fixture props for a state preview.                        | [Develop and debug](../guides/develop-and-debug.md)    |

`defineResourceLayout(options)` returns `createResourceLayout` (with `.forResource(...)` and `.forResources(...)`), `createResourceConfig`, `createResourceLinks`, `resources`, `ResourceProvider` and `useResource`. Statics: `forResources`, `defineResources`, `withLayout` (which also returns `Shell`).

`createDefinedResourceLayout(options)` returns `defineResourceLayout` (bound, with `.lazy`), `createRenderState` (`.defer`, `.lazy`, `.fromState`, `.forStates`), `createReusable` (2.3.0), `defineLazyDefaults` (`.createRenderState`, `.errors`), `defineResourceSurface` (2.7.0) and `resources`.

## Props and validation exports

| Export                        | Class      | Use it to                                                         |
| ----------------------------- | ---------- | ----------------------------------------------------------------- |
| `createProp`                  | Deprecated | Describe a prop with the built-in builder. Use Standard Schema.   |
| `createPrimitivePropBuilder`  | Deprecated | Build primitive `createProp` builders.                            |
| `isPropDefinitionShape`       | Deprecated | Test for a legacy definition shape.                               |
| `validateProps`               | Utility    | Validate prop definitions against values.                         |
| `resolvePropDefinitionValues` | Utility    | Resolve validated values from definitions.                        |

`createProp` was deprecated in 2.6.0 and removed in v3.

## Composable exports

| Export                          | Class     | Use it to                                                     |
| ------------------------------- | --------- | ------------------------------------------------------------- |
| `defineComposableComponent`     | Primary   | Define a composable with typed props.                         |
| `createComposableComponent`     | Authoring | Create one composable component.                              |
| `createLayoutComposableFactory` | Authoring | Build the `create` function a layout receives.                |
| `resolveLayoutComposables`      | Authoring | Resolve a layout's composables callback.                      |
| `collectComposablePresetEntries`| Authoring | Collect preset metadata from composables.                     |
| `resolveComposablePresetProps`  | Authoring | Resolve preset prop definitions.                              |
| `LayoutComposablePresetProvider`| Authoring | Provide preset values to composables.                         |
| `makeComposable`                | Authoring | Create a composable resource layout.                          |

## Resource utilities

| Export                         | Class      | What it does                                                         |
| ------------------------------ | ---------- | -------------------------------------------------------------------- |
| `normalizeResource`            | Utility    | Normalize one resource declaration to a tree with `value`.           |
| `normalizeResources`           | Utility    | Normalize an array of resource declarations.                         |
| `normalizeResourceDefinitions` | Utility    | Normalize declarations, keeping tuple positions and literals.        |
| `toResourceEnum`               | Utility    | Turn normalized resources into a non-empty array of keys.            |
| `pick`                         | Utility    | Copy the listed keys of an object into a new object.                 |
| `isLazyResourceError`          | Supporting | Narrow a value to `LazyResourceError`.                               |

## Errors

| Error                            | Raised when                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `ReactLayoutError`               | Base class for structured library errors.                                |
| `LayoutConfigurationError`       | A definition is invalid. Base for several below.                         |
| `InvalidConfigError`             | A resource config is malformed.                                          |
| `InvalidPathError`               | A path does not exist.                                                   |
| `InvalidResourceError`           | A resource is not declared.                                              |
| `InvalidSubResourceError`        | A sub-resource is not declared under its parent.                         |
| `InvalidComponentError`          | A component slot is not configured.                                      |
| `MissingPathVariableError`       | A path variable was not supplied.                                        |
| `MissingResourceProviderError`   | `useResource` ran outside a provider.                                    |
| `InvalidPartError`               | A naming convention received an undeclared part key.                     |
| `InvalidPartTypeError`           | A naming part had the wrong kind of value.                               |
| `PropError`                      | A prop failed validation.                                                |
| `LazyResourceModuleShapeError`   | A lazy module does not export exactly one component or state.            |
| `LazyResourceStateNotFoundError` | A lazy resource has no state of the requested name.                      |
| `ResourceModuleLoadError`        | A dynamic import failed. Extends `Error`.                                |
| `ResourceRenderError`            | An exception was thrown while rendering a named state. Extends `Error`.  |

## Deprecated or removed during v2

| Item                                                | Status in 2.7.0 | Use instead                                              |
| --------------------------------------------------- | --------------- | -------------------------------------------------------- |
| `createProp` and the validator builders             | Deprecated      | Standard Schema plus the adapters                        |
| `defineLazyDefaults.createErrorComponent`           | Deprecated      | `defineLazyDefaults.createRenderState({ state: 'Error' })` |
| `props.include` `visibility` and `passthrough`      | Removed in 2.0.0| `required` and `suppliedVia`                             |
| Layout render context `resource`                    | Removed in 2.0.0| `resources.current`                                      |

## Companion package exports

### React values in schemas

| Export                      | Package suffix                                 | Returns                                          |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `reactNode`, `reactElement` | `adapter-zod`, `adapter-valibot`, `adapter-arktype` | A native schema for a React node or element |
| `createAdapter`             | `adapters`                                     | `{ reactNode, reactElement }` from your callbacks |

Packages are named `@jfdevelops/react-layout-<suffix>`. There is no Effect adapter in v2.

### Preset composable

| Export                       | Package suffix          | Component    | Props      |
| ---------------------------- | ----------------------- | ------------ | ---------- |
| `createBreadcrumbComposable` | `composable-breadcrumb` | `Breadcrumb` | `segments` |

### Inspection

| Export                                                                       | Package suffix   | Use it to                                    |
| ---------------------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| `ReactLayoutDevtools`, `ReactLayoutDevtoolsContent`                          | `devtools-react` | Show the floating or embedded inspector.     |
| `ReactLayoutDevtoolsProvider`, `…Toolbar`, `…Explorer`, `…Inspector`, `…Footer`, `…Workspace`, `useReactLayoutDevtools` | `devtools-react` | Compose a custom inspector. |
| `reactLayoutDevtools`                                                        | `devtools-vite`  | Vite plugin for source links and previews.   |

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Migration from v1](../migration.md)
