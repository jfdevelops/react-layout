---
'@jfdevelops/react-layout': minor
---

Add `asComposable({ props: { include } })` to eager, deferred, and lazy render-state builders. Layout-level composables callbacks receive typed state references as their second argument, including forward references. Selected props inherit the containing state's values, while explicit JSX props override them. Bound layouts can merge local state-reference composables with their shared factory composables.
