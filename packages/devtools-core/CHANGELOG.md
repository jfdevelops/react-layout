# @jfdevelops/react-layout-devtools-core

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
