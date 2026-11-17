# @jfdevelops/react-layout-composable-actions

## 0.2.1

### Patch Changes

- Updated dependencies [3c3c4fe]
  - @jfdevelops/react-layout-composables@1.2.1

## 0.2.0

### Minor Changes

- c5bd2ea: The navigation, copy, actions and access contracts now define their props with the built-in validators, and their prop types are inferred from those definitions. Rejected values report the built-in messages and the path of the invalid field, such as `Invalid prop "items.home.href": Expected a string`.

  `@jfdevelops/react-layout-composable-actions`: an unknown intent is reported at `actions.<id>.intent`, so `InvalidIntentError`'s context no longer has `action`, and its message is `Unknown intent "loud"; expected primary, destructive`. `Action` and `Actions` are no longer generic.

### Patch Changes

- 25b2ecc: The navigation and actions contracts define their props inline and infer `NavigationItem`, `NavigationItems`, `Action` and `Actions` from the created composable. The types are unchanged.
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

- 6b0bb7d: Add `@jfdevelops/react-layout-composable-actions` with the `Actions` preset for a page's link-style actions and its contract, exported from `/contract`.

  An action's `intent` is `primary` or `destructive` by default; pass `intents` to `createActionsComposable` as a list, or as a function of the defaults, to choose your own. An action with any other intent is rejected: the `PropError` reporting the `actions` prop has an `InvalidIntentError`, exported from the package root, as its `cause`.

### Patch Changes

- Updated dependencies [1707339]
- Updated dependencies [7eb2eaa]
- Updated dependencies [9e37bf5]
- Updated dependencies [d6ea68f]
  - @jfdevelops/react-layout-validator@1.1.0
  - @jfdevelops/react-layout-composables@1.1.0
