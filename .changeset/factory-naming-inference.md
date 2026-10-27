---
"@jfdevelops/react-layout": patch
---

Fix factory-level naming callbacks being inferred as undefined and causing composable types to fall back to an empty object. Preserve naming context, packaged breadcrumb props, reused render-state props, and generated component props through the complete factory-to-JSX flow.
