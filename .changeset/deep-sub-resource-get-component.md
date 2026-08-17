---
'@jfdevelops/react-layout': minor
---

Deepen `getComponent` for nested sub-resources. Sub-resources are keyed directly on their parent in `createResourceConfig` (the `subResources` wrapper is gone), nested `subResource` params use `{ value, subResource }`, and `getComponent` accepts both options and deep config path overloads. Add `ComponentTypes<T>` to infer the union of component selectors defined in a created resource config.
