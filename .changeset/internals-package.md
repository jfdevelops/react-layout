---
"@jfdevelops/react-layout-internals": minor
"@jfdevelops/react-layout": major
"@jfdevelops/react-layout-composables": major
---

Add `@jfdevelops/react-layout-internals`, the single home for types and helpers shared across React Layout packages (`Show`, `ShowCallable`, `UnionToIntersection`, `BaseComponent`, `capitalize`). Core and composables depend on it and keep re-exporting the public types. It is an implementation detail with no stability guarantee; do not import it directly.

The layout, render-state, and lazy-default `props` shapes now share one `PropsContract` interface, with `TypedPropsContract` for checked custom props, instead of repeating `{ include?, custom? }` inline.
