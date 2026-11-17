---
'@jfdevelops/react-layout-composable-actions': minor
---

Add `@jfdevelops/react-layout-composable-actions` with the `Actions` preset for a page's link-style actions and its contract, exported from `/contract`.

An action's `intent` is `primary` or `destructive` by default; pass `intents` to `createActionsComposable` as a list, or as a function of the defaults, to choose your own. An action with any other intent is rejected: the `PropError` reporting the `actions` prop has an `InvalidIntentError`, exported from the package root, as its `cause`.
