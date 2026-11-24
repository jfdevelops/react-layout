---
title: TypeScript
description: What React Layout infers from your definitions and how to take types back out.
order: 40
---

React Layout is written in TypeScript. CI checks the published factory types on TypeScript 5.9 and 6. You rarely write type arguments: resource keys, option props, render state names and component names are inferred from your definitions.

## What is inferred

- **Resource keys.** The `resources` list defines the allowed keys. Passing any other `resource` is a type error. See [Resources and layouts](./guides/resource-layouts.md).
- **Props.** Option and component-time props come from your schemas. Required props, including `children: 'required'`, are checked by TypeScript and at runtime. See [Props and validation](./guides/props-and-validation.md).
- **Component names.** Without a `name`, resource `'users'` generates `'UsersLayout'` at runtime and as an exact TypeScript literal.
- **Render state names.** Inline render maps infer the union of their declared state names. Independent `createRenderState` definitions use `string`; bind them with `createRenderState.forStates(...)`. See [Render states](./guides/render-states.md#derive-a-state).

## Take a type from a definition

Use `getSchema(path)` and read `infer` to reuse a prop's value type elsewhere:

```tsx
// createNavigationComposable is defined in the Composables and presets guide.
const itemsSchema = createNavigationComposable.getSchema('items');
const hrefSchema = createNavigationComposable.getSchema('items.[string].href');

export type NavigationItems = typeof itemsSchema.infer;
export type Href = typeof hrefSchema.infer;
```

`infer` exists only in types and is `undefined` at runtime. The full path syntax is in [Composables and presets](./guides/composables-and-presets.md#take-a-type-from-a-definition).

## Let TypeScript infer

Most large builder types declare invariant type parameters. Inferred usage works. Avoid assigning one builder or result type to another with different arguments, and avoid writing type arguments by hand.

Declare composable references in the layout-level `composables` callback rather than inside a state entry. That avoids a TypeScript limitation with callback return inference inside reverse-mapped state entries.

## Editor suggestions in `isSubResourceKey`

TypeScript 5.9 still offers root suggestions for the `path` property inside `isSubResourceKey` options. TypeScript 6 follows the typed prefix. The complete path is validated either way.
