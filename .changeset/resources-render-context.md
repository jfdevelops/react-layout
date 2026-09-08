---
'@jfdevelops/react-layout': minor
---

Add resource access helpers to `defineResourceLayout`.

- The `render` context now exposes an `isResource` type guard and a `resources` accessor. The accessor's `resources.current` replaces the render context's now-deprecated `resource`, which will be removed next major.
- `defineResourceLayout` now returns a `resources` accessor: `resources()` returns the raw resources, `resources.pick(...names)` returns only the picked resources, and `resources.omit(...names)` returns the resources except the omitted ones.
- Added `defineResourceLayout.defineResources(...values)` for declaring a strongly-typed `resources` array without an `as const` assertion.
