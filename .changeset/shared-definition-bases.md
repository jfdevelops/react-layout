---
"@jfdevelops/react-layout": major
---

Give the definition and context types shared bases, and one generic name per slot.

- New `RenderDefinition<Props, Composables, Render>` interface. `LayoutDefinition`, `ShellLayoutDefinition`, `TypedInlineRenderState`, and the render-state definitions now extend it, so they are interfaces with one documented `props`, `composables`, and `render`.
- **Breaking:** `RenderStateContext` takes its parameters as `<Resources, Composables, States>`, matching the layout and shell render contexts. It was `<Composables, Resources, States>`, and `Resources` no longer has a default.
- Every `createResourceLayout` call shape builds on one `{ resource, name?, props? }` base.
- The resource-selection helpers have a single definition.
- Type parameters use one name per slot: `Options`, `IncludeProps`, `CustomProps`, and `Resources`. Positions are unchanged.
