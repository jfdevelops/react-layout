# @jfdevelops/react-layout-devtools-react

## 0.3.0

### Minor Changes

- 6dcbc54: Report lazy resource load status (`unresolved`, `loading`, `resolved`, `error`) to devtools, and show the failed load's error and `cause` chain in the node details.

  Unify lazy resources, render states, and scoped components around a cached loader with `preload()`, `status`, fallback overrides, retry, and inspection. Add `lazy` content to scoped component shells to avoid circular content imports. Preserve `createRenderState.lazy(load)` and also accept `{ load, fallback }`.

  **Breaking:** lazy error boundaries now handle only the closed `LazyResourceError` union. Ordinary page render errors propagate to an enclosing route boundary instead of a configured lazy `Error` component. Lazy proxy compound states must start with a capital letter; lowercase and React/Promise statics no longer synthesize state components.

  Lazy defaults receive the factory's resource path union in `resource`, plus typed errors discriminated by `code`. Add type-only `defineLazyDefaults.errors` and `createErrorComponent` (render callback or optional code handlers with fallback, including custom props). Import error messages include the original cause; configuration failures use distinct shape and missing-state errors that retain `LayoutConfigurationError` compatibility.

  Remove the deprecated include settings `visibility` and `passthrough`; use `required` and `suppliedVia`. Legacy settings now produce a configuration error. Remove the deprecated layout render-context `resource` property; read `resources.current` instead. Naming callbacks and resource/error props retain their non-deprecated `resource` fields. Migrate examples, tests, autocomplete, and devtools guidance to the supported API.

## 0.2.0

### Minor Changes

- cd9ca1e: Use a compact floating panel with persisted move/resize geometry and expand/dock controls. Split Explorer and Details in compact mode while retaining side-by-side panes in wide hosts. Expose a provider, toolbar, explorer, inspector, footer, workspace and shared-state hook for custom embedded compositions. Keep production exclusion across all new component exports.
- 1aa0b36: Add per-response CSP nonce support and an external stylesheet mode backed by an exported styles.css asset. Consolidate animation and reduced-motion rules into one stylesheet, keep nonce values out of saved preferences, and defer inspector UI to the client to avoid server-rendered inline style attributes.
- 37d6484: Add Locate selection to reveal filtered nodes, expand their tree ancestors, and center and focus them in the current view. Add Reset preferences to restore caller defaults and clear the saved FAB location.
- 120a747: Exclude the React inspector from production bundles by default using empty components and dead-code elimination. Add an explicit /production entry and the Vite plugin's production option to keep the inspector enabled when desired. Development source instrumentation remains disabled during production builds.
- 5fe22c3: Add a prop-type dropdown populated from the selected node's available types. Combine it with search, included/custom and required/optional filters on the same row.
- 120a747: Move shared devtools configuration, palette defaults, preference validation, nested merging and serialization into devtools-core. Keep browser persistence and FAB coordinates in the React adapter, preserving the existing storage key and saved settings. Expose a separate transient session-state type and exclude selection, search and render-state overrides from serialized preferences.
- 5bc1c23: Add an opt-in Vite development plugin that supplies source locations and enables per-instance render-state previews. Show declaration and registration files with Open in editor actions in the inspector. Add typed defineLayoutPreview fixtures, Auto controls, forced-state indicators, recoverable preview errors, and cleanup when the last inspector disconnects. Production builds and server-side transforms are not instrumented.

### Patch Changes

- 37d6484: Honor the initial active count supplied when registering inspection nodes while preserving live mount counts during metadata updates. Keep tooltips visible while either their trigger is hovered or it retains keyboard focus.
- 0c83d89: Replace compact Explorer/Details pane buttons with a back arrow shown only in Details. Selecting a node opens Details; returning to Explorer preserves selection and scroll position.
- 98ae70c: Keep the prop search and both prop filters on one row, letting the search field fill the available space.
- bcb0de1: Make selected node details programmatically focusable for compact navigation.
- 120a747: Make source locations themselves clickable, with hyperlink styling, instead of rendering separate Open in editor buttons. Locations without editor integration remain plain text.
- 120a747: Dismiss tooltips on pointer and keyboard activation and prevent retained focus or pointer movement from immediately reopening them. Keep trigger focus intact and allow tooltips to appear again on a new hover or focus interaction.

## 0.1.0

### Minor Changes

- 4767a1c: Add optional graph devtools with a framework-independent inspection core, an animated floating React inspector, and embeddable content for TanStack Devtools. Track mounted layouts and states, lazy declarations, resources, composables, and explicit state references. Add shared prop contracts and reusable resource-specific naming defaults with local overrides.
