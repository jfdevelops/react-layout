---
'@jfdevelops/react-layout': patch
'@jfdevelops/react-layout-validator': patch
---

Add regression coverage for named props on `createComponent` components bound
with `asHOF`, and correct the factory-pattern guidance for included layout
props. Reuse shared required and optional helpers across the layout and
included prop resolvers.
