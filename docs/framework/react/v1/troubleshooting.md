---
title: Troubleshooting
description: Common errors and type errors, what causes each, and how to fix it.
order: 130
---

Each entry gives the symptom, the cause and the fix. Find the heading that matches what you
see.

## Definitions and naming

### `resource` is a type error, or a lookup throws `InvalidResourceError`

The resource is not in the `resources` list. Add it to the definition, or fix the spelling.
Sub-resources use dot paths such as `users.managers`. A path that does not exist throws
`InvalidPathError`, and a missing variable such as `$resource` throws
`MissingPathVariableError`.

### `useResource` throws `MissingResourceProviderError`

The component is not rendered inside a page created by that definition. Render it under a
created page, or wrap it in the definition's `ResourceProvider`.

### `InvalidPartError` or `InvalidPartTypeError` from a naming convention

A naming part has an undeclared key or the wrong kind of value. Declare the part with
`defineLayoutName.defineParts(...)`, pass a value of the declared kind, or set `strict: false`.

### `defineLayoutName` or `namingFn` rejects my argument

Since 1.6.1 both require a single configuration object with a `pattern` and an optional
`strict`. The callback-only shorthand was removed.

### A scoped component name is rejected

Names such as `makeComposable`, `name` or `call` collide with reserved members. A resource
whose capitalized name is `Root` is also rejected. Rename the resource or component.

## Props

### A prop fails validation

A failed prop throws a `PropError` with the prop path, layout name and resource. Supply the
value, or make the definition `.optional()`.

### `visibility` or `passthrough` still compile

They are deprecated aliases in v1. Prefer `required` and `suppliedVia`. Both are removed in
2.0.0 and produce a configuration error there.

### `createProp.array` is missing

It does not exist in v1. Describe the value with `createProp.object` or `createProp.record`,
or use a `createProp.component({ type: 'ReactNode' })` for rendered content.

## Lazy loading

### A lazy module throws about its exports

A lazy module must export exactly one component (or one state, for
`createRenderState.lazy`) created by the library.

### A lazy `Error` shows for a render exception

That is v1 behavior. In v2 and later it handles only lazy failures. See
[Migrating to v2](../v2/migration.md).

## Devtools

### The inspector is empty

Pass the **full factory result** as `source`, not one created component. Modules that were
never imported cannot contribute definitions.

### The inspector renders nothing

The default import is empty when `process.env.NODE_ENV` is `production`. Use the `/production`
entry, or `reactLayoutDevtools({ production: true })` with the Vite plugin, to keep it on
purpose.

### Source links or state previews are missing

They need `@jfdevelops/react-layout-devtools-vite` in a development Vite build.

## Next steps

- [API reference](./reference/api.md)
- [Migration from v0](./migration.md)
