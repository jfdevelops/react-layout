# @jfdevelops/react-layout-composable-actions

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
