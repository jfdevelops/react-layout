# @jfdevelops/react-layout-composables

## 0.5.1

### Patch Changes

- 0e7c7d3: Bump `@jfdevelops/create-error` to 0.2.1 and drop the local type-export patch now that the published package re-exports the needed types.
- Updated dependencies [0e7c7d3]
  - @jfdevelops/react-layout-validator@0.4.1

## 0.5.0

### Minor Changes

- f9ebf87: Add `createProp.array(itemDefinition)` with inferred element types, optional arrays, unions, and indexed validation errors. Re-export `createProp` from the composables package.
- dbd131a: Add an object overload to factories returned by `defineComposableComponent`, allowing per-instance prop extensions and overrides, names, wrappers, and render callbacks. Preserve the existing render-callback overload and factory defaults.
- 9638939: Expose optional React children in render props and generated component calls by default. Reserve `props.custom.children: 'required'` for controlling the built-in content slot, with validation. Forward actual children to defined-composable render callbacks and the shell's first render argument.

### Patch Changes

- Updated dependencies [f9ebf87]
  - @jfdevelops/react-layout-validator@0.4.0

## 0.4.0

### Minor Changes

- 6af59d5: Add persisted development composable outlines, labelled by owning layout, with hover and selection linking to the inspector. Instrument intrinsic roots without adding layout wrappers; skip roots without a DOM element.

### Patch Changes

- e2f7c2b: Highlight the toolbar's current layout on hover or keyboard focus, and add a per-item highlight button to the inspector. Targeted page highlights work independently of composable outlines and follow mounted roots as the app changes. Mark existing layout roots only in development, without adding DOM wrappers.

## 0.3.1

### Patch Changes

- ea3f501: Restore breadcrumb segments inference and props.include suggestions when presets come from a separately installed composables version. Recognize preset metadata across distinct declaration symbols for the shared runtime key.

  Accept the public base-prop shape across validator versions without requiring the same protected class identity.

  Preserve shared include inference when a packaged breadcrumb is spread alongside locally created composables.

- Updated dependencies [ea3f501]
  - @jfdevelops/react-layout-validator@0.3.1

## 0.3.0

### Minor Changes

- 5bc1c23: Add an opt-in Vite development plugin that supplies source locations and enables per-instance render-state previews. Show declaration and registration files with Open in editor actions in the inspector. Add typed defineLayoutPreview fixtures, Auto controls, forced-state indicators, recoverable preview errors, and cleanup when the last inspector disconnects. Production builds and server-side transforms are not instrumented.

## 0.2.8

### Patch Changes

- Updated dependencies [b67e590]
  - @jfdevelops/react-layout-validator@0.3.0

## 0.2.7

### Patch Changes

- 715f3f8: Use `@jfdevelops/create-error` with ArkType-backed Standard Schemas to provide named, typed errors throughout the React Layout packages.
- Updated dependencies [715f3f8]
  - @jfdevelops/react-layout-validator@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies [bf71123]
  - @jfdevelops/react-layout-validator@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies [54f9024]
  - @jfdevelops/react-layout-validator@0.2.5

## 0.2.4

### Patch Changes

- acc2ae3: Use one structured `PropError` with precise prop paths, layout names, and resources for missing or invalid props.
- Updated dependencies [acc2ae3]
  - @jfdevelops/react-layout-validator@0.2.4

## 0.2.3

### Patch Changes

- Disable tsdown auto-generated exports so `package.json` types conditions are preserved when publishing.
- Updated dependencies
  - @jfdevelops/react-layout-validator@0.2.3

## 0.2.2

### Patch Changes

- Restore `types` export condition and `.d.mts` types entry for correct TypeScript resolution under `moduleResolution: "bundler"`.
- Updated dependencies
  - @jfdevelops/react-layout-validator@0.2.2

## 0.2.1

### Patch Changes

- 6b29ea9: Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.
- Updated dependencies [6b29ea9]
  - @jfdevelops/react-layout-validator@0.2.1

## 0.2.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.

### Patch Changes

- Updated dependencies [6dfc052]
  - @jfdevelops/react-layout-validator@0.2.0
