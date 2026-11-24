# @jfdevelops/react-layout-adapter-effect

## 1.1.0

### Minor Changes

- 4ad676e: Add createResourceSchema to each schema adapter, using a shared createResourceSchemaAdapter factory and supporting literal union and array schemas, independent nested-resource handling, and typed arguments for resource methods.

### Patch Changes

- Updated dependencies [4ad676e]
  - @jfdevelops/react-layout-adapters@1.1.0

## 1.0.0

### Major Changes

- 65da0eb: Release every React Layout package as part of the coordinated major release for the Standard Schema prop system and updated public types.

### Minor Changes

- 13357bb: Add `@jfdevelops/react-layout-adapter-effect`: native Effect 4 schemas for `React.ReactNode` and `React.ReactElement`. `reactNode()` and `reactElement()` return Effect schemas that are also Standard Schemas, so they work directly as React Layout props and compose with `Schema.Struct`, `Schema.Array`, and `Schema.optional`.

### Patch Changes

- Updated dependencies [65da0eb]
- Updated dependencies [c60ad4f]
  - @jfdevelops/react-layout-adapters@1.0.0
