# @jfdevelops/react-layout-devtools-core

## 1.0.0

### Major Changes

- 65da0eb: Release every React Layout package as part of the coordinated major release for the Standard Schema prop system and updated public types.
- c60ad4f: Remove `createProp` and the legacy prop-definition system. Props are described only with Standard Schema definitions (Zod, Valibot, ArkType, Effect, or any other Standard Schema library) and the React adapters.

  **Removed**

  - `createProp`, `createPrimitivePropBuilder`, `isPropDefinitionShape`, and every builder class and type exported by `@jfdevelops/react-layout-validator` (`BaseProp`, `StringProp`, `ObjectProp`, `ComponentProp`, `LegacyPropDefinition`, and the rest).
  - Values carried by a definition. A literal definition no longer supplies its own value; give the schema a default.

  **Changed**

  - `@jfdevelops/react-layout-validator` now exports `PropDefinition`, `PropDefinitions`, `ResolveProps`, `ResolveInputProps`, `InputDefinitions`, `DefinitionVisibility`, `validateProps`, `validateDefinition`, `resolvePropDefinitionValues`, `isStandardSchema`, and `PropError`. `AnyBuiltPropDefinition` is now `PropDefinition`; `BuiltPropShape` is `PropDefinitions`; `ResolveLayoutProps`, `ResolveLayoutPropsAsDefined`, and `ResolvedBuiltPropShape` are `ResolveProps`; `ResolveLayoutInputProps` and `ResolvedInputShape` are `ResolveInputProps`. It no longer has a React peer dependency.
  - A failed prop reports the schema's own message as `Invalid prop "<path>": <message>`, including for a missing required prop.
  - Whether an object keeps undeclared keys is decided by your schema library.
  - A defined composable uses an explicitly passed prop, even `undefined`, instead of falling back to the provider value.
  - The breadcrumb composable's default `segments` definition is an ArkType-backed schema exported as `BreadcrumbSegmentsSchema`. `@jfdevelops/react-layout-composables` no longer re-exports `createProp`.
  - Devtools display schema types, vendor names, and required/optional metadata when available without validating values. Unsupported metadata falls back to `unknown`.
  - `@jfdevelops/react-layout-internals` exports `NonEmptyReadonlyArray`.

  See "Migrating from `createProp`" in `docs/standard-schema.md`.

  Component slots are available through `componentSlot`. Callback options and nested reusable selections remain supported. Use `createPropsFromComponent(Component).pick(...)` or `.omit(...)` to reuse component prop schemas.

### Minor Changes

- c60ad4f: Show prop types and schema vendors in inspection details using schema metadata without validating values. Recognize Zod JSON Schema metadata, Valibot structures, ArkType expressions, and React adapter type names. Unsupported schemas display `unknown`.

  Expose `schemaTypeNameSymbol` from the adapter factory package so predicate schemas can retain readable React type names. Devtools search also matches schema vendors.

- a418ac4: Share more duplicated shapes.

  - Layout and shell render contexts extend one internal base for `composables`, `inProps`, and `name`; `ShellRenderContext` is now an interface.
  - Devtools core exports `DevtoolsView`, `DevtoolsFilters`, and `DevtoolsTreeOptions`. `DevtoolsConfig` and `DevtoolsPreferences` are both built from them instead of repeating the fields.
  - The devtools overlay, outlines, and explorer viewport share one `ElementBounds` shape.

### Patch Changes

- 27941fc: Keep property documentation on its property in published declarations. The declaration bundler moved every single-line `/** … */` member comment onto the line of the member before it, so editors showed no docs (or the wrong docs) on hover. Member comments are now written in block form, which the bundler preserves.

## 0.4.0

### Minor Changes

- 6af59d5: Add persisted development composable outlines, labelled by owning layout, with hover and selection linking to the inspector. Instrument intrinsic roots without adding layout wrappers; skip roots without a DOM element.
- b6c6728: Speed up devtools interactions in large apps. Store notifications are coalesced per microtask through the new `subscribeInspectionBatched`, graph layout and the inspection tree are cached per snapshot, search is deferred, both explorer views stay mounted, and trees and graphs over 200 nodes render only the rows and cards near the viewport.

## 0.3.0

### Minor Changes

- 6dcbc54: Report lazy resource load status (`unresolved`, `loading`, `resolved`, `error`) to devtools, and show the failed load's error and `cause` chain in the node details.

  Unify lazy resources, render states, and scoped components around a cached loader with `preload()`, `status`, fallback overrides, retry, and inspection. Add `lazy` content to scoped component shells to avoid circular content imports. Preserve `createRenderState.lazy(load)` and also accept `{ load, fallback }`.

  **Breaking:** lazy error boundaries now handle only the closed `LazyResourceError` union. Ordinary page render errors propagate to an enclosing route boundary instead of a configured lazy `Error` component. Lazy proxy compound states must start with a capital letter; lowercase and React/Promise statics no longer synthesize state components.

  Lazy defaults receive the factory's resource path union in `resource`, plus typed errors discriminated by `code`. Add type-only `defineLazyDefaults.errors` and `createErrorComponent` (render callback or optional code handlers with fallback, including custom props). Import error messages include the original cause; configuration failures use distinct shape and missing-state errors that retain `LayoutConfigurationError` compatibility.

  Remove the deprecated include settings `visibility` and `passthrough`; use `required` and `suppliedVia`. Legacy settings now produce a configuration error. Remove the deprecated layout render-context `resource` property; read `resources.current` instead. Naming callbacks and resource/error props retain their non-deprecated `resource` fields. Migrate examples, tests, autocomplete, and devtools guidance to the supported API.

## 0.2.0

### Minor Changes

- 120a747: Move shared devtools configuration, palette defaults, preference validation, nested merging and serialization into devtools-core. Keep browser persistence and FAB coordinates in the React adapter, preserving the existing storage key and saved settings. Expose a separate transient session-state type and exclude selection, search and render-state overrides from serialized preferences.
- 5bc1c23: Add an opt-in Vite development plugin that supplies source locations and enables per-instance render-state previews. Show declaration and registration files with Open in editor actions in the inspector. Add typed defineLayoutPreview fixtures, Auto controls, forced-state indicators, recoverable preview errors, and cleanup when the last inspector disconnects. Production builds and server-side transforms are not instrumented.

### Patch Changes

- 37d6484: Honor the initial active count supplied when registering inspection nodes while preserving live mount counts during metadata updates. Keep tooltips visible while either their trigger is hovered or it retains keyboard focus.

## 0.1.0

### Minor Changes

- 4767a1c: Add optional graph devtools with a framework-independent inspection core, an animated floating React inspector, and embeddable content for TanStack Devtools. Track mounted layouts and states, lazy declarations, resources, composables, and explicit state references. Add shared prop contracts and reusable resource-specific naming defaults with local overrides.
