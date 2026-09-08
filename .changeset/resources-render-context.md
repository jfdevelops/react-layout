---
'@jfdevelops/react-layout': minor
---

Add resource access helpers to `defineResourceLayout`.

- The `render` context now exposes a `resources` accessor. `resources.current` replaces the render context's now-deprecated `resource`, which will be removed next major.
- `defineResourceLayout` now returns a `resources` accessor: `resources()` returns the raw resources, `resources.pick(...names)` returns only the picked resources, `resources.omit(...names)` returns the resources except the omitted ones, and `resources.isResource(value)` narrows an unknown value to a resource key.
- Added `defineResourceLayout.defineResources(...values)` for declaring a strongly-typed `resources` array without an `as const` assertion.
