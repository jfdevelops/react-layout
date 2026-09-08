---
'@jfdevelops/react-layout': minor
---

Add resource access helpers to `defineResourceLayout`.

- The `render` context now exposes `currentResource` (replacing the now-deprecated `resource`, which will be removed next major), an `isResource` type guard, and a `resources` accessor.
- `defineResourceLayout` now returns a `resources` accessor: `resources()` returns the raw resources, `resources.pick(...names)` returns only the picked resources, and `resources.omit(...names)` returns the resources except the omitted ones.
