# @jfdevelops/react-layout

## 0.4.1

### Patch Changes

- 6b29ea9: Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.
- Updated dependencies [6b29ea9]
  - @jfdevelops/react-layout-composables@0.2.1
  - @jfdevelops/react-layout-validator@0.2.1

## 0.4.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.
- 3d7f627: add ability to define reusable composables

### Patch Changes

- Updated dependencies [6dfc052]
  - @jfdevelops/react-layout-validator@0.2.0
  - @jfdevelops/react-layout-composables@0.2.0

## 0.3.0

### Minor Changes

- 1db7504: Adds `forResource` factory function to aid in the creation of layout for a single resource
- f4ed819: - adds `setDefaults` to layout factories created with `forResource`
  - default layout option values are set in a single call
  - non-JSX props accept plain values, with optional `Updater` overrides when creating a layout
  - `JSX.Element` props accept render functions that receive their defined element props
  - fixes included `JSX.Element` props to surface as render functions in `LayoutRenderProps`

### Patch Changes

- 73a782d: - adds the `forResource` helper to `getComponent` for creating reusable resource scoped `getComponent` helpers
  - the config is now returned from `createResourceConfig`
- fbdaaa0: adds createResourceConfig function for dynamic resource retrieval

## 0.2.0

### Minor Changes

- 9550541: Add `capitalize` utility for naming composable components

## 0.1.1

### Patch Changes

- 66f66eb: Switch library builds to `tsdown` and add Changesets-based release management for the package.
