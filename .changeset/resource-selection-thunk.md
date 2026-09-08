---
'@jfdevelops/react-layout': minor
---

Refine the `resources` accessor on `defineResourceLayout` and its `render` context.

- `resources.pick(...)` / `resources.omit(...)` now require at least one key and return a `ResourceSelection` thunk: call it (`resources.pick('posts')()`) for the matching definitions, or use its `isResource` guard to narrow a value against just that selection.
- `pick` / `omit` now keep widened resource definitions (`string[]`, `ResourceDefinition[]`) instead of collapsing them to `never[]`.
- Export `ResourceSelection` and `ResourceDefinitionValue` types.
