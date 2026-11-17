---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

Add `getSchema(path)` to factories created by `defineComposableComponent`. The path is the composable's name and a prop, `Actions.actions`, optionally followed by a path into a built-in definition: `Actions.actions.[string].href`. Every path is suggested by the editor and the returned definition is typed. A factory built with `defineContext` returns the definitions made from its default values.
