---
'@jfdevelops/react-layout': minor
---

Add createRenderState.fromState({ ref, ... }) to inherit a created state's props and expose it as composables.Ref. Inherit all props by default, select subsets with props.include, and add or override validators with props.custom. Support eager, deferred, and lazy refs, including chained derivation. Preserve optional and component-valued props when forwarding inherited values. The optional lazy: true flag defers Ref rendering without deferring the derived state.
