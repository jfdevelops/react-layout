---
title: Migrating from v2 to v3
description: Replace createProp with Standard Schema, adapt to implicit children and invariant types, and update renamed validator exports.
order: 140
---

v3.0.0 removed the legacy `createProp` system and tightened several public types.
Most of the work is replacing prop definitions.

In this guide you will:

- replace `createProp` definitions with Standard Schema ones
- handle behavior that changed with the new definitions
- fix type errors caused by invariant builder types and renamed exports

Source: the 3.0.0 section of the core changelog and the "Migrating from `createProp`"
section of `docs/standard-schema.md` at the 3.3.0 tag.

## Upgrade the package

```sh
pnpm add @jfdevelops/react-layout@3.3.0
pnpm add zod @jfdevelops/react-layout-adapter-zod@1.0.0
```

Use the schema library you prefer. Companion package versions are in the
[compatibility table](./getting-started.md#companion-package-versions).

## 1. Replace `createProp`

`createProp`, `createPrimitivePropBuilder`, `isPropDefinitionShape` and every builder
class and type exported by `@jfdevelops/react-layout-validator` (`BaseProp`,
`StringProp`, `ObjectProp`, `ComponentProp`, `LegacyPropDefinition` and the rest)
were removed. Describe props with a Standard Schema library and the React adapters.

| Removed definition                                   | Zod replacement                       |
| ---------------------------------------------------- | ------------------------------------- |
| `createProp.string()`                                | `z.string()`                          |
| `createProp.number().optional()`                     | `z.number().optional()`               |
| `createProp.string().literal('a')`                   | `z.literal('a')`                      |
| `createProp.string().enum(['a', 'b'])`               | `z.enum(['a', 'b'])`                  |
| `createProp.array(createProp.string())`              | `z.array(z.string())`                 |
| `createProp.object({ name: createProp.string() })`   | `z.object({ name: z.string() })`      |
| `createProp.record({ value: createProp.string() })`  | `z.record(z.string(), z.string())`    |
| `createProp.component({ type: 'ReactNode' })`        | `reactNode()`                         |
| `createProp.component({ type: 'JSX.Element' })`      | `reactElement()` for element values   |

`reactNode()` and `reactElement()` come from the adapter package for your schema
library. See [Props and validation](./guides/props-and-validation.md#react-values-and-adapters).

## 2. Behavior that changed

- **Component slots.** Use `componentSlot({ props: { label: z.string() } })`. A slot
  named `actions` is still supplied and rendered as `Actions`.
- **Values carried by a definition.** A literal definition used to supply its own
  value. Give the schema a default instead, for example `z.literal('docs').default('docs')`.
- **`options` as a function.** `options: ({ resource, name }) => ...` still works.
  Return schemas.
- **Nested reusable selections.** `options: { meta: { owner: true } }` still works.
- **`createProp.fromComponent`.** Use `createPropsFromComponent(Component).pick(...)`
  or `.omit(...)`.
- **Error messages.** A failed prop reports the schema's own message as
  `Invalid prop "<path>": <message>`, including for a missing required prop.
- **Unknown keys.** Your schema library now decides whether an object keeps
  undeclared keys.
- **Explicit `undefined`.** A defined composable uses an explicitly passed prop, even
  `undefined`, instead of falling back to the provider value.
- **Devtools.** Props show their type and schema vendor where metadata is available.
  Unknown schemas show `unknown`. Inspection never validates a value.
- **Breadcrumb segments.** The default `segments` definition is an ArkType-backed
  schema exported as `BreadcrumbSegmentsSchema`. The composables package no longer
  re-exports `createProp`.

## 3. Children are implicit

React components include optional `children: ReactNode` automatically, including
layouts, shells, render states and scoped components. Delete any
`props.custom.children: reactNode()` you added. To use a different type, declare a
`children` schema, which replaces the default. Reusable helpers and option schemas get
no implicit children.

## 4. Renamed validator exports

`@jfdevelops/react-layout-validator` now exports `PropDefinition`, `PropDefinitions`,
`ResolveProps`, `ResolveInputProps`, `InputDefinitions`, `DefinitionVisibility`,
`validateProps`, `validateDefinition`, `resolvePropDefinitionValues`,
`isStandardSchema` and `PropError`. It no longer has a React peer dependency.

| Old name                                                           | New name                |
| ------------------------------------------------------------------ | ----------------------- |
| `AnyBuiltPropDefinition`                                           | `PropDefinition`        |
| `BuiltPropShape`                                                   | `PropDefinitions`       |
| `ResolveLayoutProps`, `ResolveLayoutPropsAsDefined`, `ResolvedBuiltPropShape` | `ResolveProps` |
| `ResolveLayoutInputProps`, `ResolvedInputShape`                    | `ResolveInputProps`     |

`@jfdevelops/react-layout-internals` exports `NonEmptyReadonlyArray`. It is private.

## 5. Type changes that can break compilation

- Most large builder types now declare **invariant** type parameters. Assigning one
  such type to the same type with different arguments, which used to succeed
  structurally, is now an error. Inferred usage is unaffected.
- `Show` is a plain mapped type and no longer preserves call signatures. Use the new
  `ShowCallable` for types that may be callable. Composables previously reduced a
  callable `Show` to its bare call signature, so check any code relying on that.
- `RenderStateContext` takes `<Resources, Composables, States>` and `Resources` has no
  default. It was `<Composables, Resources, States>`.
- Type parameters use one name per slot (`Options`, `IncludeProps`, `CustomProps`,
  `Resources`). Positions did not change.
- `CreateViewMapOptions` and related option types are now interfaces over shared
  bases (`ResourceLayoutScope`, `ResourceLayoutConfig`). Layout, render-state and lazy
  default `props` share a `PropsContract` interface.

## 6. Smaller removals

- `defineLazyDefaults.createErrorComponent` and the `CreateLazyErrorComponent` type
  were removed. Use `defineLazyDefaults.createRenderState({ state: 'Error', render })`,
  which accepts the same render callback or code-keyed handlers. Declare custom props in
  `props.custom`.
- `defineResourceLayout.withLayout` now accepts `name`. It was honored at runtime but
  missing from the types.

## Checklist

1. Install an adapter for your schema library.
2. Replace each `createProp` call using the table above.
3. Replace imports of removed validator types.
4. Run your type check and fix invariance and `Show` errors.
5. Remove explicit `children` declarations you no longer need.

## Next steps

- [Props and validation](./guides/props-and-validation.md)
- [Troubleshooting](./troubleshooting.md)
- Next major: [v3 to v4](../v4/guides/migration.md)
