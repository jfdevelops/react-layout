---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout-validator': minor
'@jfdevelops/react-layout': minor
---

A prop of `defineComposableComponent` can now be a validator function instead of a Standard Schema. The function receives `{ value, error }`: the supplied value as `unknown` and an `error` helper. It returns the validated value, whose type is the prop type, and rejects it with `throw error('Expected text')`. `error` creates a `PropValidatorError`. The thrown error is the `cause` of the `PropError` that reports the value. `createPropValidator` turns a validator function into a reusable definition, and `.optional()` on its result accepts a missing value.

A composable's `props` is now typed with the same `CustomPropsObject` as `props.custom`, so `children: 'required'` is accepted. A string on any other prop throws `InvalidComposablePropsError`.

The composables package and `@jfdevelops/react-layout` re-export `builtIn`, `createPropValidator` and `PropValidatorError`.
