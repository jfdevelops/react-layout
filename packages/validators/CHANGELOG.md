# @jfdevelops/react-layout-validator

## 0.2.6

### Patch Changes

- bf71123: Add unified include, custom, and defined props to resource component entries, including direct creation from forResources.

## 0.2.5

### Patch Changes

- 54f9024: Add regression coverage for named props on `createComponent` components bound
  with `asHOF`, and correct the factory-pattern guidance for included layout
  props. Reuse shared required and optional helpers across the layout and
  included prop resolvers.

## 0.2.4

### Patch Changes

- acc2ae3: Use one structured `PropError` with precise prop paths, layout names, and resources for missing or invalid props.

## 0.2.3

### Patch Changes

- Disable tsdown auto-generated exports so `package.json` types conditions are preserved when publishing.

## 0.2.2

### Patch Changes

- Restore `types` export condition and `.d.mts` types entry for correct TypeScript resolution under `moduleResolution: "bundler"`.

## 0.2.1

### Patch Changes

- 6b29ea9: Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.

## 0.2.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.
