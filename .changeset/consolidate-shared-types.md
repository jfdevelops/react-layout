---
"@jfdevelops/react-layout": major
"@jfdevelops/react-layout-composables": major
---

Consolidate types that were duplicated across the codebase.

- `Show`, `ShowCallable`, `UnionToIntersection`, `BaseComponent`, and `capitalize` now have one definition, shared by `@jfdevelops/react-layout` and `@jfdevelops/react-layout-composables`.
- **Breaking:** the composables `Show` previously reduced a callable type to its bare call signature. It is now the same plain mapped type as in core; use `ShowCallable` to keep a call signature.
- `LayoutIncludeProps` is defined once and replaces the hand-written `IncludedProps<MergedLayoutInProps<…>>` constraints.
- `NonEmptyResources` and `NestedSubResourceDefinitions` each have a single definition next to `ResourceDefinition`.
