---
title: Props and validation
description: Describe props with the createProp builder, include them in layouts, and understand validation errors.
order: 40
---

In v1 every prop is described with `createProp`, a small builder exported by `@jfdevelops/react-layout`. A definition gives the prop a type, makes it required or optional, and is validated at runtime when a page renders. Standard Schema libraries are not supported until 2.6.0, and `createProp` was removed in v3.

In this guide you will:

- build prop definitions with `createProp`
- choose where a value is supplied with `props.include`
- add per-layout props with `props.custom`
- read prop validation errors

## Build definitions

| Builder                                             | Type it describes                                            |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `createProp.string()`                               | `string`. Also `.optional()`, `.literal('a')`, `.enum([...])`. |
| `createProp.number()`                               | `number`. Same modifiers.                                    |
| `createProp.boolean()`                              | `boolean`. Same modifiers.                                   |
| `createProp.object({ key: definition })`            | An object with typed keys.                                   |
| `createProp.record({ value: definition })`          | A record of values.                                          |
| `createProp.component({ type: 'ReactNode' })`       | A React value. The type is `'ReactNode'` or `'JSX.Element'`. |
| `createProp.fromComponent(Component)`               | The retained prop definitions of a created component. Use `.pick(...)` or `.omit(...)`. |

Definitions compose with `.optional()` and `.or(other)` for unions.

```tsx
options: {
  title: createProp.string(),
  description: createProp.string().optional(),
  meta: createProp.object({ owner: createProp.string() }),
},
```

`createProp.array` does not exist in v1. It is absent from 2.0.0 and present by 2.7.0.

## Include props in a layout

`options` holds the definitions. `layout.props.include` decides which ones the render callback receives and where their values are supplied.

| Form                        | Meaning                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `title: true`               | Required, supplied when the page is created.                      |
| `title: 'optional'`         | Optional, accepted when the page is created or on the component.  |
| `title: { required, suppliedVia }` | Explicit (1.5.0). `suppliedVia` is `'component'` or `'config'`. |

`visibility` and `passthrough` are older spellings. They are deprecated aliases in v1, accepted alongside the new names (the new names win), and removed in v2.

## Add per-layout props

`props.custom` adds definitions that belong to one layout or state and are not shared options. A render state can declare its own `custom` props too.

```tsx
Error: {
  props: {
    custom: {
      error: createProp.object({ message: createProp.string() }),
    },
  },
  render: ({ error }) => <p>{error.message}</p>,
},
```

## Children

Automatic optional `children` in render props, and the `children: 'required'` shorthand, arrived in 2.3.0. In v1, declare a `children` definition if your layout renders them, for example `createProp.component({ type: 'ReactNode' }).optional()`.

## Errors

A failed prop throws a `PropError` (added in 0.17.1) with precise prop paths, the layout name and the resource. It covers both missing and invalid props.

## Next steps

- [Render states](./render-states.md)
- [Resources and layouts](./resource-layouts.md)
- [Migrating to v2](../../v2/migration.md) and [Standard Schema in v2](../../v2/guides/props-and-validation.md)
