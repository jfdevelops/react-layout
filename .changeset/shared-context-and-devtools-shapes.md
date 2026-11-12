---
"@jfdevelops/react-layout": patch
"@jfdevelops/react-layout-devtools-core": minor
"@jfdevelops/react-layout-devtools-react": patch
---

Share more duplicated shapes.

- Layout and shell render contexts extend one internal base for `composables`, `inProps`, and `name`; `ShellRenderContext` is now an interface.
- Devtools core exports `DevtoolsView`, `DevtoolsFilters`, and `DevtoolsTreeOptions`. `DevtoolsConfig` and `DevtoolsPreferences` are both built from them instead of repeating the fields.
- The devtools overlay, outlines, and explorer viewport share one `ElementBounds` shape.
