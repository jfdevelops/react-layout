# @jfdevelops/react-layout-composable-copy

## 0.1.2

### Patch Changes

- Updated dependencies [3c3c4fe]
  - @jfdevelops/react-layout-composables@1.2.1

## 0.1.1

### Patch Changes

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

- 0e68f4f: Add `@jfdevelops/react-layout-composable-copy` with the `Header` and `Meta` presets and the copy contract they are built from, exported from `/contract`. Both presets share `title` and `description`, so a page supplies each value once.

### Patch Changes

- Updated dependencies [1707339]
- Updated dependencies [7eb2eaa]
- Updated dependencies [9e37bf5]
- Updated dependencies [d6ea68f]
  - @jfdevelops/react-layout-validator@1.1.0
  - @jfdevelops/react-layout-composables@1.1.0
