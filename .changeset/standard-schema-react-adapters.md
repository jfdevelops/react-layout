---
'@jfdevelops/react-layout': minor
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout-validator': minor
'@jfdevelops/react-layout-adapter-zod': minor
'@jfdevelops/react-layout-adapter-valibot': minor
'@jfdevelops/react-layout-adapter-arktype': minor
'@jfdevelops/react-layout-adapters': minor
---

Accept whole object schemas as options and synchronous Standard Schema field definitions alongside legacy prop validators,
including schema constants, inferred caller inputs and render outputs, defaults,
transforms, and contextual schema issues. Add native React node and element
schemas through separate opt-in Zod, Valibot, and ArkType adapter packages. Deprecate
the custom createProp builder in preparation for removal in the next major release.

Expose the named createAdapter factory from the schema-library independent
adapters package for constructing native React node and element schemas.
