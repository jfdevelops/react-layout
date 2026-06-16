---
"@jfdevelops/react-layout": minor
"@jfdevelops/react-layout-composables": patch
---

Add top-level `createResourceLayout.makeComposable` for creating a `ComposableResourceLayout` directly with `CreateResourceLayoutMakeComposableOptions` (required `name` and `resource`, optional layout props). Matches `createResourceLayout(...).makeComposable()` and is only available when the layout defines composables. Improve `MakeComposable` typing to support optional overrides of defined options.
