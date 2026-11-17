# @jfdevelops/react-layout-composable-navigation

## 0.1.0

### Minor Changes

- 89fa004: The default `segments` definition of `createBreadcrumbComposable` is now a validator function, so its `~standard.vendor` is `react-layout` instead of `arktype`.

  Add `@jfdevelops/react-layout-composable-navigation` with the `Breadcrumb` and `Tabs` presets and the navigation contract they are built from, exported from `/contract`. Navigation items accept `href` and `isDisabled`.

  `@jfdevelops/react-layout-composable-breadcrumb` now re-exports `createBreadcrumbComposable` from the navigation package, so breadcrumb segments accept `href` and `isDisabled` too.

### Patch Changes

- Updated dependencies [1707339]
- Updated dependencies [7eb2eaa]
- Updated dependencies [9e37bf5]
- Updated dependencies [d6ea68f]
  - @jfdevelops/react-layout-validator@1.1.0
  - @jfdevelops/react-layout-composables@1.1.0
