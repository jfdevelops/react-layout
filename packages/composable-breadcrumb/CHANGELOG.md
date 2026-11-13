# @jfdevelops/react-layout-composable-breadcrumb

## 1.0.0

### Major Changes

- 65da0eb: Release every React Layout package as part of the coordinated major release for the Standard Schema prop system and updated public types.
- c60ad4f: Remove `createProp` and the legacy prop-definition system. Props are described only with Standard Schema definitions (Zod, Valibot, ArkType, Effect, or any other Standard Schema library) and the React adapters.

  **Removed**

  - `createProp`, `createPrimitivePropBuilder`, `isPropDefinitionShape`, and every builder class and type exported by `@jfdevelops/react-layout-validator` (`BaseProp`, `StringProp`, `ObjectProp`, `ComponentProp`, `LegacyPropDefinition`, and the rest).
  - Values carried by a definition. A literal definition no longer supplies its own value; give the schema a default.

  **Changed**

  - `@jfdevelops/react-layout-validator` now exports `PropDefinition`, `PropDefinitions`, `ResolveProps`, `ResolveInputProps`, `InputDefinitions`, `DefinitionVisibility`, `validateProps`, `validateDefinition`, `resolvePropDefinitionValues`, `isStandardSchema`, and `PropError`. `AnyBuiltPropDefinition` is now `PropDefinition`; `BuiltPropShape` is `PropDefinitions`; `ResolveLayoutProps`, `ResolveLayoutPropsAsDefined`, and `ResolvedBuiltPropShape` are `ResolveProps`; `ResolveLayoutInputProps` and `ResolvedInputShape` are `ResolveInputProps`. It no longer has a React peer dependency.
  - A failed prop reports the schema's own message as `Invalid prop "<path>": <message>`, including for a missing required prop.
  - Whether an object keeps undeclared keys is decided by your schema library.
  - A defined composable uses an explicitly passed prop, even `undefined`, instead of falling back to the provider value.
  - The breadcrumb composable's default `segments` definition is an ArkType-backed schema exported as `BreadcrumbSegmentsSchema`. `@jfdevelops/react-layout-composables` no longer re-exports `createProp`.
  - Devtools display schema types, vendor names, and required/optional metadata when available without validating values. Unsupported metadata falls back to `unknown`.
  - `@jfdevelops/react-layout-internals` exports `NonEmptyReadonlyArray`.

  See "Migrating from `createProp`" in `docs/standard-schema.md`.

  Component slots are available through `componentSlot`. Callback options and nested reusable selections remain supported. Use `createPropsFromComponent(Component).pick(...)` or `.omit(...)` to reuse component prop schemas.

### Patch Changes

- Updated dependencies [65da0eb]
- Updated dependencies [a418ac4]
- Updated dependencies [a418ac4]
- Updated dependencies [27941fc]
- Updated dependencies [c60ad4f]
  - @jfdevelops/react-layout-composables@1.0.0
  - @jfdevelops/react-layout-validator@1.0.0

## 0.2.14

### Patch Changes

- Updated dependencies [766e29b]
  - @jfdevelops/react-layout-composables@0.6.0
  - @jfdevelops/react-layout-validator@0.5.0

## 0.2.13

### Patch Changes

- Updated dependencies [0e7c7d3]
  - @jfdevelops/react-layout-composables@0.5.1
  - @jfdevelops/react-layout-validator@0.4.1

## 0.2.12

### Patch Changes

- Updated dependencies [f9ebf87]
- Updated dependencies [dbd131a]
- Updated dependencies [9638939]
  - @jfdevelops/react-layout-validator@0.4.0
  - @jfdevelops/react-layout-composables@0.5.0

## 0.2.11

### Patch Changes

- Updated dependencies [6af59d5]
- Updated dependencies [e2f7c2b]
  - @jfdevelops/react-layout-composables@0.4.0

## 0.2.10

### Patch Changes

- Updated dependencies [ea3f501]
  - @jfdevelops/react-layout-composables@0.3.1
  - @jfdevelops/react-layout-validator@0.3.1

## 0.2.9

### Patch Changes

- Updated dependencies [5bc1c23]
  - @jfdevelops/react-layout-composables@0.3.0

## 0.2.8

### Patch Changes

- Updated dependencies [b67e590]
  - @jfdevelops/react-layout-validator@0.3.0
  - @jfdevelops/react-layout-composables@0.2.8

## 0.2.7

### Patch Changes

- Updated dependencies [715f3f8]
  - @jfdevelops/react-layout-composables@0.2.7
  - @jfdevelops/react-layout-validator@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies [bf71123]
  - @jfdevelops/react-layout-validator@0.2.6
  - @jfdevelops/react-layout-composables@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies [54f9024]
  - @jfdevelops/react-layout-validator@0.2.5
  - @jfdevelops/react-layout-composables@0.2.5

## 0.2.4

### Patch Changes

- Updated dependencies [acc2ae3]
  - @jfdevelops/react-layout-composables@0.2.4
  - @jfdevelops/react-layout-validator@0.2.4

## 0.2.3

### Patch Changes

- Disable tsdown auto-generated exports so `package.json` types conditions are preserved when publishing.
- Updated dependencies
  - @jfdevelops/react-layout-composables@0.2.3
  - @jfdevelops/react-layout-validator@0.2.3

## 0.2.2

### Patch Changes

- Restore `types` export condition and `.d.mts` types entry for correct TypeScript resolution under `moduleResolution: "bundler"`.
- Updated dependencies
  - @jfdevelops/react-layout-composables@0.2.2
  - @jfdevelops/react-layout-validator@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [6b29ea9]
  - @jfdevelops/react-layout-composables@0.2.1
  - @jfdevelops/react-layout-validator@0.2.1

## 0.2.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.

### Patch Changes

- Updated dependencies [6dfc052]
  - @jfdevelops/react-layout-validator@0.2.0
  - @jfdevelops/react-layout-composables@0.2.0
