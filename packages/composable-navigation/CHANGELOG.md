# @jfdevelops/react-layout-composable-navigation

## 0.1.2

### Patch Changes

- Updated dependencies [3c3c4fe]
  - @jfdevelops/react-layout-composables@1.2.1

## 0.1.1

### Patch Changes

- 25b2ecc: The navigation and actions contracts define their props inline and infer `NavigationItem`, `NavigationItems`, `Action` and `Actions` from the created composable. The types are unchanged.
- c5bd2ea: The navigation, copy, actions and access contracts now define their props with the built-in validators, and their prop types are inferred from those definitions. Rejected values report the built-in messages and the path of the invalid field, such as `Invalid prop "items.home.href": Expected a string`.

  `@jfdevelops/react-layout-composable-actions`: an unknown intent is reported at `actions.<id>.intent`, so `InvalidIntentError`'s context no longer has `action`, and its message is `Unknown intent "loud"; expected primary, destructive`. `Action` and `Actions` are no longer generic.

- Updated dependencies [caeb573]
- Updated dependencies [62d8112]
- Updated dependencies [d710f10]
- Updated dependencies [e8bf8ef]
- Updated dependencies [62d8112]
- Updated dependencies [708be93]
  - @jfdevelops/react-layout-validator@1.2.0
  - @jfdevelops/react-layout-composables@1.2.0

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
