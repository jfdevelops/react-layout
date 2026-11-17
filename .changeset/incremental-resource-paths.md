---
'@jfdevelops/react-layout': patch
---

Complete resource paths one segment at a time in `getComponent`, `createGetComponent`, `getComponentForPath`, `forPaths`, and `isSubResourceKey`, while continuing to validate the complete supplied path. Fully specified paths keep their inferred return types.

TypeScript 5.9 still offers root suggestions for the `path` property inside `isSubResourceKey` options; TypeScript 6 follows that property's typed prefix.
