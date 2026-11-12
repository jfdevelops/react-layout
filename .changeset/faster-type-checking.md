---
"@jfdevelops/react-layout": major
---

Make the public generic types cheaper to type-check. Checking the core package and its tests takes about 45% fewer type instantiations and roughly half the check time.

- The large builder and result types (`DefinedResourceLayout`, `BoundDefineResourceLayout`, `CreateDefinedResourceLayoutResult`, `CreateRenderState`, `CreateViewMapRenderStatesOptions`, `DefinedResourceLayoutFromStates`, `RenderStateReferences`, `FromStateDefinition`, and the resource/scoped layout builders) declare the variance of their type parameters, so TypeScript no longer measures it structurally.
- **Breaking:** most of those parameters are declared invariant. Assigning one of these types to the same type with different type arguments, which could previously succeed structurally, is now an error. Inferred usage is unaffected.
- Internal implementation casts no longer compare two large generic types.
- **Breaking:** `Show` is now a plain mapped type and no longer preserves call signatures. Use the new `ShowCallable` for types that may be callable.
- `MergedLayoutInProps` resolves the inferred options once instead of twice.
