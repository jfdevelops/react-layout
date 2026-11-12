---
"@jfdevelops/react-layout": major
"@jfdevelops/react-layout-validator": major
"@jfdevelops/react-layout-composables": major
"@jfdevelops/react-layout-composable-breadcrumb": major
"@jfdevelops/react-layout-devtools-core": major
"@jfdevelops/react-layout-devtools-react": minor
"@jfdevelops/react-layout-internals": minor
---

Remove `createProp` and the legacy prop-definition system. Props are described only with Standard Schema definitions (Zod, Valibot, ArkType, Effect, or any other Standard Schema library) and the React adapters.

**Removed**

- `createProp`, `createPrimitivePropBuilder`, `isPropDefinitionShape`, and every builder class and type exported by `@jfdevelops/react-layout-validator` (`BaseProp`, `StringProp`, `ObjectProp`, `ComponentProp`, `LegacyPropDefinition`, and the rest).
- Component slots: a `JSX.Element` definition no longer becomes a capitalized component prop and can no longer declare its own props. Pass an element with `reactElement()`.
- Values carried by a definition. A literal definition no longer supplies its own value; give the schema a default.
- `options` as a function of `{ resource, name }` (`InPropsFunction`, `InPropsOptions`). Pass an object schema or a map of schemas.
- Nested reusable selections such as `options: { meta: { owner: true } }`. Select the whole field or use a selector.
- `createProp.fromComponent` and the prop definitions attached to created components.

**Changed**

- `@jfdevelops/react-layout-validator` now exports `PropDefinition`, `PropDefinitions`, `ResolveProps`, `ResolveInputProps`, `InputDefinitions`, `DefinitionVisibility`, `validateProps`, `validateDefinition`, `resolvePropDefinitionValues`, `isStandardSchema`, and `PropError`. `AnyBuiltPropDefinition` is now `PropDefinition`; `BuiltPropShape` is `PropDefinitions`; `ResolveLayoutProps`, `ResolveLayoutPropsAsDefined`, and `ResolvedBuiltPropShape` are `ResolveProps`; `ResolveLayoutInputProps` and `ResolvedInputShape` are `ResolveInputProps`. It no longer has a React peer dependency.
- A failed prop reports the schema's own message as `Invalid prop "<path>": <message>`, including for a missing required prop.
- Whether an object keeps undeclared keys is decided by your schema library.
- A defined composable uses an explicitly passed prop, even `undefined`, instead of falling back to the provider value.
- The breadcrumb composable's default `segments` definition is an ArkType-backed schema exported as `BreadcrumbSegmentsSchema`. `@jfdevelops/react-layout-composables` no longer re-exports `createProp`.
- Devtools describe a prop by its schema vendor, such as `zod schema`. `PropValidatorDescription` no longer has `visibility`, and custom props no longer show a required or optional chip, because a schema is never run to describe it.
- `@jfdevelops/react-layout-internals` exports `NonEmptyReadonlyArray`.

See "Migrating from `createProp`" in `docs/standard-schema.md`.
