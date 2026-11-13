---
"@jfdevelops/react-layout": minor
---

Rebuild the layout option types as interfaces over shared bases.

- New `ResourceLayoutScope` (`namespace`, `resources`, `options`) and `ResourceLayoutConfig` (adds `name`) interfaces, exported alongside `CreateViewMapOptions`.
- `CreateViewMapOptions`, `CreateViewMapRenderStatesOptions`, `CreateViewMapInlineRenderStatesOptions`, and `CreateDefinedResourceLayoutOptions` are now interfaces extending `ResourceLayoutConfig`; `CreateResourceLayoutWithLayoutOptions` extends `ResourceLayoutScope`.
- `CreateDefinedResourceLayoutOptions['props']` reuses `LayoutProps`.
- `CreateViewMapInlineRenderStatesOptions` no longer passes its `Namespace` argument into the `Render` slot, so `namespace` is typed correctly.
