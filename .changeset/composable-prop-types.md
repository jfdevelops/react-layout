---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

A factory created by `defineComposableComponent` holds its definition under its name: `createActionsComposable.Actions.props` are the prop definitions, each usable as a validator, and `typeof createActionsComposable.Actions.infer.actions` is a prop's value type. `infer` exists only in types and is `undefined` at runtime. An extended factory is read under its own name. The type is exported as `ComposableDefinition`.
