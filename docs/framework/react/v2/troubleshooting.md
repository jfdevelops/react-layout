---
title: Troubleshooting
description: Common errors and type errors, what causes each, and how to fix it.
order: 130
---

Each entry gives the symptom, the cause and the fix. Find the heading that
matches what you see.

## Definitions and naming

### `resource` is a type error, or a lookup throws `InvalidResourceError`

The resource is not in the `resources` list. Add it to the definition, or fix the
spelling. Sub-resources use dot paths such as `users.managers`. A lookup with a
path that does not exist throws `InvalidPathError`, and a missing variable such as
`$resource` throws `MissingPathVariableError`.

### `useResource` throws `MissingResourceProviderError`

The component is not rendered inside a page created by that definition. Render it
under a created page, or wrap it in the definition's `ResourceProvider`.

### `InvalidPartError` or `InvalidPartTypeError` from a naming convention

A naming part has an undeclared key or the wrong kind of value. Declare the part
with `defineLayoutName.defineParts(...)`, pass a value of the declared kind, or set
`strict: false` to turn checking off.

### A scoped component name is rejected

Names such as `makeComposable`, `state`, `name` or `call` collide with reserved
members. A resource whose capitalized name is `Root` is also rejected. Rename the
resource or component.

## Props and validation

### `Invalid prop "title": …`

A `PropError`. Read `error.path`, `error.layoutName`, `error.resource` and
`error.issues` to find the prop. A missing required prop reports the same way.
Supply the value, or make the schema optional or give it a default.

### An async schema throws instead of validating

Validation is synchronous. Validate async data before rendering, and use schemas
that do not return promises.

### `children` is required but the page does not render children

`props.custom.children: 'required'` is checked at runtime and by types. Pass
children, or remove the shorthand to keep children optional.

## Lazy loading

### `LazyResourceModuleShapeError`

The lazy module must have exactly one named export created by the library. `received`
holds the count it found. Export one component or state, or split the module.

### My lazy `Error` does not show for a render exception

Lazy `Error` handles lazy failures only (`resourceModuleLoad`,
`lazyResourceModuleShape`, `lazyResourceStateNotFound`). Wrap the route in an error
boundary.

### `Page.loading` or `Page.then` is `undefined`

Compound state access on a lazy proxy needs a capitalized name. Awaiting a lazy
component does not treat it as a thenable.

## Hosted surfaces

### `hostedBy` is required, or it is rejected

Hosted factories require `hostedBy`. Root factories reject it. Make sure you created
the layout through `defineResourceSurface` when you need a host, and through
`defineResourceLayout` when you do not. A value outside `host.resources` is also
rejected unless `host.resources` is `'*'`.

## Devtools

### The inspector is empty

Pass the **full factory result** as `source`, not one created component. Definitions
made outside the factory, and modules that were never imported, do not appear.
Lazy declarations appear before import.

### The inspector renders nothing

The default import is empty when `process.env.NODE_ENV` is `production`. Use the
`/production` entry, or `reactLayoutDevtools({ production: true })` with the Vite
plugin, to keep it on purpose.

### Source links or state previews are missing

They need `@jfdevelops/react-layout-devtools-vite` in a development Vite build. They
are not instrumented in production or in server-side transforms.

## Packages and versions

### Peer dependency warnings from an adapter

Adapters need `react` ≥18 and their schema library at the supported range: Zod
`^4.0.0`, Valibot `^1.0.0` and ArkType `^2.2.8`. See the
[compatibility table](./getting-started.md#companion-package-versions).

### `createProp` is not available after upgrading

`createProp` was removed in v3. In v2 it still works but is deprecated. See
[Props and validation](./guides/props-and-validation.md#keep-using-createprop-while-you-migrate).

## Next steps

- [API reference](./reference/api.md)
- [Migration from v1](./migration.md)
