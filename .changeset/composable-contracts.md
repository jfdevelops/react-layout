---
'@jfdevelops/react-layout-composable-navigation': patch
'@jfdevelops/react-layout-composable-copy': patch
'@jfdevelops/react-layout-composable-access': patch
'@jfdevelops/react-layout-composable-actions': minor
---

The navigation, copy, actions and access contracts now define their props with the built-in validators, and their prop types are inferred from those definitions. Rejected values report the built-in messages and the path of the invalid field, such as `Invalid prop "items.home.href": Expected a string`.

`@jfdevelops/react-layout-composable-actions`: an unknown intent is reported at `actions.<id>.intent`, so `InvalidIntentError`'s context no longer has `action`, and its message is `Unknown intent "loud"; expected primary, destructive`. `Action` and `Actions` are no longer generic.
