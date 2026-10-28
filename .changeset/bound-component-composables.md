---
'@jfdevelops/react-layout': minor
---

Expose `makeComposable` on components returned by `createComponent(...).asHOF()(resource)` when the layout defines composables. The helper supplies the bound resource, preserves typed composable parts, and uses the scope's default name when no name is supplied. Bound components and their helpers retain their cached identity. Without composables the helper remains undefined. `makeComposable` is reserved as a scoped component name.
