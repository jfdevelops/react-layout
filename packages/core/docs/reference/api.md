---
title: API reference
description: Every runtime export and factory member, plus companion exports used with them, each with a classification.
---

This page lists what you can import and what you get back from the factories.
It covers the runtime exports of `@jfdevelops/react-layout` 4.0.0, the members of
the objects those functions return, and the exports of companion packages that
guides use. The export lists were read from `packages/core/src/index.ts` and the
companion `src/index.ts` files at the v4.0.0 tag.

## How exports are classified

| Class          | Meaning                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Primary**    | An entry point the guides teach. Start here.                                               |
| **Supporting** | A public helper used alongside primary APIs, covered in a guide.                           |
| **Utility**    | A small exported helper. It is public, but no guide teaches it.                            |
| **Authoring**  | Low-level plumbing for people who write preset composables or integrations.                |
| **Error**      | An error class. See the note under Errors for which base class each one extends.            |
| **Deprecated** | Still works, scheduled for removal, with a replacement named.                              |

Types are public too, but there are 212 type exports from the core entry point, so
this page names only the ones guides mention. Import them with `import type`.
`@jfdevelops/react-layout-internals` is private and unpublished. Never import it.

## Definition functions

| Export                       | Class   | Use it to                                                                | Guide                                                        |
| ---------------------------- | ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `defineResourceLayout`       | Primary | Define resources, options and a layout in one call.                      | [Resources and layouts](../guides/resource-layouts.md)       |
| `createDefinedResourceLayout`| Primary | Bind resources, options and composables once, then split across files.   | [Getting started](../getting-started.md)                     |
| `defineResourceSurfaces`     | Primary | Declare a root family and its hosted families in one call.               | [Hosted surfaces](../guides/hosted-surfaces.md)              |
| `defineLayoutName`           | Primary | Build a reusable naming convention.                                      | [Resources and layouts](../guides/resource-layouts.md#naming) |
| `defineLayoutPreview`        | Primary | Supply typed fixture props for a render-state preview.                   | [Develop and debug](../guides/develop-and-debug.md)          |

### `defineResourceLayout(options)`

Options: `resources`, `options` (a schema map or one object schema), `layout`
(`composables`, `props`, `render`), `name`, `namespace`.

Returns an object with:

| Member                 | What it is                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ |
| `createResourceLayout` | Creates a page component. Also `.forResource(...)` and `.forResources(...)`.   |
| `createResourceConfig` | Builds the resource config for routers. Also `.forResource(...)`.              |
| `createResourceLinks`  | Builds navigation entries. Also `.withGroups(...)` and `.defineIcon`.          |
| `resources`            | The resource accessor.                                                         |
| `ResourceProvider`     | Provides the current resource manually.                                        |
| `useResource`          | Reads the current resource. Throws `MissingResourceProviderError` outside one. |

Static members: `defineResourceLayout.forResources(...)`,
`defineResourceLayout.defineResources(...)` and
`defineResourceLayout.withLayout(options)`, which also returns `Shell`.

### `createDefinedResourceLayout(options)`

Options: `resources`, `options`, `composables`, `props` (`include`, `custom`),
`name`, `namespace`.

Returns an object with:

| Member                 | What it is                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| `defineResourceLayout` | Bound `defineResourceLayout`. Takes the layout directly. Also `.lazy(...)`.       |
| `createRenderState`    | Creates a state. Also `.defer`, `.lazy`, `.fromState`, `.forStates`.              |
| `createReusable`       | Creates a typed helper function. See [Reusable helpers](../guides/reusable-helpers.md). |
| `defineLazyDefaults`   | Sets shared `Loading` and `Error` UI. Also `.createRenderState` and `.errors`.    |
| `defineResourceSurface`| Defines a hosted family attached to these resources.                              |
| `resources`            | The resource accessor.                                                            |

The result is also what you pass to the inspector as `source`.

## Props and validation exports

| Export                       | Class      | Use it to                                                           | Guide                                                              |
| ---------------------------- | ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `builtIn`                    | Primary    | Use the library's own validators without a schema library.          | [Composables and presets](../guides/composables-and-presets.md)    |
| `createPropValidator`        | Primary    | Make a reusable validator function.                                 | [Composables and presets](../guides/composables-and-presets.md#define-your-own-composable) |
| `componentSlot`              | Primary    | Declare a prop that holds a nested component slot.                  | [Props and validation](../guides/props-and-validation.md)          |
| `createPropsFromComponent`   | Primary    | Reuse a created component's prop schemas with `pick` and `omit`.    | [Props and validation](../guides/props-and-validation.md#reusing-component-props) |
| `isComponentSlot`            | Supporting | Test whether a value is a component slot.                           | Props and validation                                               |
| `isStandardSchema`           | Supporting | Test whether a value is a Standard Schema.                          | Props and validation                                               |
| `validateProps`              | Utility    | Validate a set of prop definitions against values.                  | none                                                               |
| `resolvePropDefinitionValues`| Utility    | Resolve validated values from prop definitions.                     | none                                                               |

## Composable exports

| Export                        | Class     | Use it to                                                         |
| ----------------------------- | --------- | ----------------------------------------------------------------- |
| `defineComposableComponent`   | Primary   | Define a composable with validated props. Has `.defineContext`.   |
| `getSchemaAtPath`             | Supporting| Read the definition at a path inside a definition.                |
| `createComposableComponent`   | Authoring | Create one composable component.                                  |
| `createLayoutComposableFactory`| Authoring| Build the `create` function a layout receives.                    |
| `resolveLayoutComposables`    | Authoring | Resolve a layout's composables callback.                          |
| `collectComposablePresetEntries` | Authoring | Collect preset metadata from composables.                      |
| `resolveComposablePresetProps`| Authoring | Resolve preset prop definitions.                                  |
| `LayoutComposablePresetProvider` | Authoring | Provide preset values to composables.                          |
| `makeComposable`              | Authoring | Create a composable resource layout.                              |

Factories made by `defineComposableComponent` have `rename`, `extend`, `getSchema`,
`props`, and a member named after the component that holds its definition.

## Resource utilities

| Export                        | Class   | What it does                                                          |
| ----------------------------- | ------- | --------------------------------------------------------------------- |
| `normalizeResource`           | Utility | Normalize one resource declaration to a tree with `value`.            |
| `normalizeResources`          | Utility | Normalize an array of resource declarations.                          |
| `normalizeResourceDefinitions`| Utility | Normalize declarations, keeping tuple positions and literals.         |
| `toResourceEnum`              | Utility | Turn normalized resources into a non-empty array of keys. Throws `LayoutConfigurationError` when empty. |
| `pick`                        | Utility | Copy the listed keys of an object into a new object.                  |
| `isLazyResourceError`         | Supporting | Narrow a value to `LazyResourceError`.                             |

## Errors

Errors defined in core extend `ReactLayoutError` or `LayoutConfigurationError`, except
`ResourceModuleLoadError` and `ResourceRenderError`, which extend `Error`. `PropError`,
`PropValidatorError` and `InvalidSchemaPathError` come from the validator package, and
the preset errors from the composables package. Each is built by its own error factory.

| Error                          | Raised when                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `ReactLayoutError`             | Base class for structured library errors.                                    |
| `LayoutConfigurationError`     | A definition is invalid. Base for several below.                             |
| `InvalidConfigError`           | A resource config is malformed.                                              |
| `InvalidPathError`             | A path does not exist.                                                       |
| `InvalidResourceError`         | A resource is not declared.                                                  |
| `InvalidSubResourceError`      | A sub-resource is not declared under its parent.                             |
| `InvalidComponentError`        | A component slot is not configured.                                          |
| `MissingPathVariableError`     | A path variable such as `$resource` was not supplied.                        |
| `MissingResourceProviderError` | `useResource` ran outside a provider.                                        |
| `InvalidPartError`             | A naming convention received an undeclared part key.                         |
| `InvalidPartTypeError`         | A naming part had the wrong kind of value.                                   |
| `PropError`                    | A prop failed validation. Has `path`, `layoutName`, `resource`, `issues`.    |
| `PropValidatorError`           | A validator function rejected a value. Becomes the `cause` of a `PropError`. |
| `LazyResourceModuleShapeError` | A lazy module does not export exactly one component or state.                |
| `LazyResourceStateNotFoundError`| A lazy resource has no state of the requested name.                         |
| `ResourceModuleLoadError`      | A dynamic import for a layout or state failed. Has `resource` and `cause`.   |
| `ResourceRenderError`          | An exception was thrown while rendering a named state. Has `resource` and `state`. |
| `ConflictingPresetPropError`   | Two presets declared one prop with different definitions.                    |
| `InvalidPropRenameError`       | A `rename` entry is invalid.                                                 |
| `InvalidComposablePropsError`  | A composable `props` entry was a string. Only `children: 'required'` accepts one. |
| `InvalidSchemaPathError`       | `getSchema` was given a path that does not resolve.                          |

## Deprecated

| Deprecated                                                    | Use instead                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `forPaths(...).addPathParams(options)`                        | `.addParams({ include: { path: options ?? true } })`              |
| `forPaths(...).addComponentKeyParams(options)`                | `.addParams({ include: { keys: options ?? true } })`              |
| Default-value form `.addParams({ title: 'Default' })`         | Schema defaults under `custom`                                    |

The deprecated methods delegate to the same implementation and still work in v4.

## Companion package exports

These are not separate products. They are the exports guides use from
companion packages, grouped by what you do with them.

### React values in schemas

| Export                          | Package                                      | Class   | Returns                                    |
| ------------------------------- | -------------------------------------------- | ------- | ------------------------------------------ |
| `reactNode`, `reactElement`     | `…-adapter-zod`, `-valibot`, `-arktype`, `-effect` | Primary | A native schema for a React node or element |
| `createAdapter`                 | `@jfdevelops/react-layout-adapters`          | Primary | `{ reactNode, reactElement }` from your callbacks |

Packages are named `@jfdevelops/react-layout-<name>`. See
[Props and validation](../guides/props-and-validation.md#react-values-and-adapters).

### Preset composables

| Export                       | Package suffix          | Component    | Props                                                |
| ---------------------------- | ----------------------- | ------------ | ---------------------------------------------------- |
| `createBreadcrumbComposable` | `composable-navigation` | `Breadcrumb` | `segments`                                           |
| `createTabsComposable`       | `composable-navigation` | `Tabs`       | `tabs`                                               |
| `createHeaderComposable`     | `composable-copy`       | `Header`     | `title`, `description?`, `eyebrow?`                  |
| `createMetaComposable`       | `composable-copy`       | `Meta`       | `title`, `description?`, `canonical?`, `image?`, `isIndexable?` |
| `createActionsComposable`    | `composable-actions`    | `Actions`    | `actions`. Also exports `InvalidIntentError`.        |
| `createAccessComposable`     | `composable-access`     | `Access`     | `roles?`, `permissions?`, `flag?`                    |

Each package also exports its contract from `/contract`, for example
`createNavigationComposable`, for use with `extend`.
See [Composables and presets](../guides/composables-and-presets.md).

### Inspection

| Export                                                                                 | Package suffix  | Use it to                                              |
| -------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------ |
| `ReactLayoutDevtools`                                                                  | `devtools-react`| Show the floating or toolbar inspector.                |
| `ReactLayoutDevtoolsContent`                                                           | `devtools-react`| Embed the inspector in your own container.            |
| `ReactLayoutDevtoolsProvider`, `…Toolbar`, `…Explorer`, `…Inspector`, `…Footer`, `…Workspace`, `useReactLayoutDevtools` | `devtools-react`| Compose a custom inspector.                |
| `reactLayoutDevtools`                                                                  | `devtools-vite` | Vite plugin for source links and state previews.       |

The inspection protocol lives in `devtools-core`, which `devtools-react`
bundles and `@jfdevelops/react-layout` depends on. See
[Develop and debug](../guides/develop-and-debug.md).

## Next steps

- [Troubleshooting](../troubleshooting.md)
- [Migration from v3](../migration.md)
