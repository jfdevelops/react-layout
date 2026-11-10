# @jfdevelops/react-layout-adapter-arktype

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
