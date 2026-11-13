# @jfdevelops/react-layout-adapters

## 1.0.0

### Major Changes

- 65da0eb: Release every React Layout package as part of the coordinated major release for the Standard Schema prop system and updated public types.

### Minor Changes

- c60ad4f: Show prop types and schema vendors in inspection details using schema metadata without validating values. Recognize Zod JSON Schema metadata, Valibot structures, ArkType expressions, and React adapter type names. Unsupported schemas display `unknown`.

  Expose `schemaTypeNameSymbol` from the adapter factory package so predicate schemas can retain readable React type names. Devtools search also matches schema vendors.

## 0.1.1

### Patch Changes

- 60a43df: Require React node fields by default across adapters. Reject top-level undefined and infer required node fields; callers can explicitly opt into optional schemas. Nested undefined children and null nodes remain valid.

## 0.1.0

### Minor Changes

- 766e29b: Accept whole object schemas as options and synchronous Standard Schema field definitions alongside legacy prop validators,
  including schema constants, inferred caller inputs and render outputs, defaults,
  transforms, and contextual schema issues. Add native React node and element
  schemas through separate opt-in Zod, Valibot, and ArkType adapter packages. Deprecate
  the custom createProp builder in preparation for removal in the next major release.

  Expose the named createAdapter factory from the schema-library independent
  adapters package for constructing native React node and element schemas.
