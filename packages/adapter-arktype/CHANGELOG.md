# @jfdevelops/react-layout-adapter-arktype

## 0.1.1

### Patch Changes

- 0b40790: Expose opaque Standard Schema interfaces for React nodes and elements instead of ArkType internal types to avoid excessive type instantiation in consumer mapped generics. Runtime schemas remain native ArkType schemas and node fields remain required by default.
- 60a43df: Require React node fields by default across adapters. Reject top-level undefined and infer required node fields; callers can explicitly opt into optional schemas. Nested undefined children and null nodes remain valid.
- Updated dependencies [60a43df]
  - @jfdevelops/react-layout-adapters@0.1.1

## 0.1.0

### Minor Changes

- 766e29b: Accept whole object schemas as options and synchronous Standard Schema field definitions alongside legacy prop validators,
  including schema constants, inferred caller inputs and render outputs, defaults,
  transforms, and contextual schema issues. Add native React node and element
  schemas through separate opt-in Zod, Valibot, and ArkType adapter packages. Deprecate
  the custom createProp builder in preparation for removal in the next major release.

  Expose the named createAdapter factory from the schema-library independent
  adapters package for constructing native React node and element schemas.

### Patch Changes

- Updated dependencies [766e29b]
  - @jfdevelops/react-layout-adapters@0.1.0
