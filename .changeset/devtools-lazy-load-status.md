---
"@jfdevelops/react-layout": major
"@jfdevelops/react-layout-devtools-core": minor
"@jfdevelops/react-layout-devtools-react": minor
---

Report lazy resource load status (`unresolved`, `loading`, `resolved`, `error`) to devtools, and show the failed load's error and `cause` chain in the node details.

Unify lazy resources, render states, and scoped components around a cached loader with `preload()`, `status`, fallback overrides, retry, and inspection. Add `lazy` content to scoped component shells to avoid circular content imports. Preserve `createRenderState.lazy(load)` and also accept `{ load, fallback }`.

**Breaking:** lazy error boundaries now handle only the closed `LazyResourceError` union. Ordinary page render errors propagate to an enclosing route boundary instead of a configured lazy `Error` component. Lazy proxy compound states must start with a capital letter; lowercase and React/Promise statics no longer synthesize state components.

Lazy defaults receive the factory's resource path union in `resource`, plus typed errors discriminated by `code`. Add type-only `defineLazyDefaults.errors` and `createErrorComponent` (render callback or optional code handlers with fallback, including custom props). Import error messages include the original cause; configuration failures use distinct shape and missing-state errors that retain `LayoutConfigurationError` compatibility.
