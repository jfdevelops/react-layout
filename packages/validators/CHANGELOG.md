# @jfdevelops/react-layout-validator

## 1.2.0

### Minor Changes

- caeb573: Add `builtIn.union(...schemas)`, which accepts a value matching any of its schemas. When none matches, a schema that accepted the kind of value reports its nested issues; otherwise one issue lists what was expected, such as `Expected a string or an object`.
- 62d8112: A built-in validator, and any schema made with `createPropValidator`, reads its value type as `typeof schema.infer`. `infer` exists only in types and is `undefined` at runtime. `InferableSchema<Value>` is a Standard Schema with that property.
- 708be93: Add `getSchemaAtPath(schema, path)`, which returns the schema at a path inside a built-in validator: object keys, `[string]` for any record key, `[number]` for any array item and indexes for tuple items, through optional schemas and union members. `SchemaPath<Value>` lists the paths and `SchemaPathValue<Value, Path>` is the value type at one. A path that does not exist, or that enters a schema from another library, throws `InvalidSchemaPathError`.

### Patch Changes

- e8bf8ef: Preserve arbitrary own keys, including `__proto__`, in validated records without changing the output prototype.

## 1.1.0

### Minor Changes

- 1707339: Add `builtIn` validators that need no schema library: `string`, `number`, `boolean`, `unknown`, `callable`, `literal(...values)`, `array(item)`, `tuple(...items)`, `record(item)` and `object(shape)`. Each is a Standard Schema with `.optional()`. The validator package now validates its error contexts with them and no longer depends on arktype.
- 9e37bf5: A prop of `defineComposableComponent` can now be a validator function instead of a Standard Schema. The function receives `{ value, error }`: the supplied value as `unknown` and an `error` helper. It returns the validated value, whose type is the prop type, and rejects it with `throw error('Expected text')`. `error` creates a `PropValidatorError`. The thrown error is the `cause` of the `PropError` that reports the value. `createPropValidator` turns a validator function into a reusable definition, and `.optional()` on its result accepts a missing value.

  A composable's `props` is now typed with the same `CustomPropsObject` as `props.custom`, so `children: 'required'` is accepted. A string on any other prop throws `InvalidComposablePropsError`.

  The composables package and `@jfdevelops/react-layout` re-export `builtIn`, `createPropValidator` and `PropValidatorError`.

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

- 27941fc: Keep property documentation on its property in published declarations. The declaration bundler moved every single-line `/** … */` member comment onto the line of the member before it, so editors showed no docs (or the wrong docs) on hover. Member comments are now written in block form, which the bundler preserves.

## 0.5.0

### Minor Changes

- 766e29b: Accept whole object schemas as options and synchronous Standard Schema field definitions alongside legacy prop validators,
  including schema constants, inferred caller inputs and render outputs, defaults,
  transforms, and contextual schema issues. Add native React node and element
  schemas through separate opt-in Zod, Valibot, and ArkType adapter packages. Deprecate
  the custom createProp builder in preparation for removal in the next major release.

  Expose the named createAdapter factory from the schema-library independent
  adapters package for constructing native React node and element schemas.

## 0.4.1

### Patch Changes

- 0e7c7d3: Bump `@jfdevelops/create-error` to 0.2.1 and drop the local type-export patch now that the published package re-exports the needed types.

## 0.4.0

### Minor Changes

- f9ebf87: Add `createProp.array(itemDefinition)` with inferred element types, optional arrays, unions, and indexed validation errors. Re-export `createProp` from the composables package.

## 0.3.1

### Patch Changes

- ea3f501: Restore breadcrumb segments inference and props.include suggestions when presets come from a separately installed composables version. Recognize preset metadata across distinct declaration symbols for the shared runtime key.

  Accept the public base-prop shape across validator versions without requiring the same protected class identity.

  Preserve shared include inference when a packaged breadcrumb is spread alongside locally created composables.

## 0.3.0

### Minor Changes

- b67e590: Add typed resource layout render states, resource/option-bound building blocks,
  deferred and lazy state loading, lazy resource component proxies with retryable
  loading and error defaults, and `createProp.fromComponent(...).pick/omit`.

## 0.2.7

### Patch Changes

- 715f3f8: Use `@jfdevelops/create-error` with ArkType-backed Standard Schemas to provide named, typed errors throughout the React Layout packages.

## 0.2.6

### Patch Changes

- bf71123: Add unified include, custom, and defined props to resource component entries, including direct creation from forResources.

## 0.2.5

### Patch Changes

- 54f9024: Add regression coverage for named props on `createComponent` components bound
  with `asHOF`, and correct the factory-pattern guidance for included layout
  props. Reuse shared required and optional helpers across the layout and
  included prop resolvers.

## 0.2.4

### Patch Changes

- acc2ae3: Use one structured `PropError` with precise prop paths, layout names, and resources for missing or invalid props.

## 0.2.3

### Patch Changes

- Disable tsdown auto-generated exports so `package.json` types conditions are preserved when publishing.

## 0.2.2

### Patch Changes

- Restore `types` export condition and `.d.mts` types entry for correct TypeScript resolution under `moduleResolution: "bundler"`.

## 0.2.1

### Patch Changes

- 6b29ea9: Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.

## 0.2.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.
