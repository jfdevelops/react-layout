---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

A factory created by `defineComposableComponent` holds its definition under its name: `createActionsComposable.Actions.props` are the prop definitions, each usable as a validator, and `typeof createActionsComposable.Actions.infer.actions` is a prop's value type. `infer` exists only in types and is `undefined` at runtime. An extended factory is read under its own name. The type is exported as `ComposableDefinition`.

Names that collide with factory methods or inherited function properties remain valid component names. In those cases the factory API takes precedence and the named definition alias is omitted; the definitions remain available through `factory.props`.
