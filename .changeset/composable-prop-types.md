---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

A factory created by `defineComposableComponent` carries its prop value types under its name, so a type can be inferred from the definition: `typeof createActionsComposable.Actions.props.actions`. The property exists only in types and is `undefined` at runtime. An extended factory is read under its own name. The type is exported as `ComposableTypes`.
