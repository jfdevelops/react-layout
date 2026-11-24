---
title: Migrating from v0 to v1
description: Replace the chained createDefinedResourceLayout builder with one configuration object and adopt the normalized resources accessor.
order: 140
---

v1.0.0 has one breaking change set: the chained `createDefinedResourceLayout` builder was replaced by a single configuration object. v0 itself changed incompatibly between many minor releases, so this guide starts from the final v0 release, `0.25.0`. If you are on an earlier `0.x`, read [the v0 notes](../v0/index.md) first.

In this guide you will:

- replace the chained builder with a configuration object
- flatten bound layout definitions
- read the normalized `resources` accessor

Source: the 1.0.0 core changelog, and the README and tests at the `0.25.0` and `1.0.0` tags.

## Upgrade the package

```npm
npm i @jfdevelops/react-layout@1.6.1
```

```pnpm
pnpm add @jfdevelops/react-layout@1.6.1
```

```yarn
yarn add @jfdevelops/react-layout@1.6.1
```

```bun
bun add @jfdevelops/react-layout@1.6.1
```

## 1. Use one configuration object

**Before (0.25.0)**

```tsx
const { composables, createRenderState, defineResourceLayout } =
  createDefinedResourceLayout('users').defineOptions({
    title: createProp.string(),
  });

export const pageComposables = composables((create) => ({
  Layout: create({ name: 'PageLayout' }),
}));
```

**After (1.0.0)**

```tsx
const { createRenderState, defineResourceLayout } = createDefinedResourceLayout({
  resources: ['users'],
  options: {
    title: createProp.string(),
  },
  composables: (create) => ({
    Layout: create({ name: 'PageLayout' }),
  }),
});
```

| 0.25.0                                       | 1.0.0                                            |
| -------------------------------------------- | ------------------------------------------------ |
| `createDefinedResourceLayout('users')`       | `createDefinedResourceLayout({ resources: ['users'] })` |
| `.defineOptions({ ... })`                    | `options: { ... }` in the configuration          |
| `composables((create) => ...)` from the result | `composables: (create) => ...` in the configuration |

The `DefinedResourceLayoutBuilder` and `DefineOptions` types were removed with the chain.

## 2. Flatten bound layout definitions

A bound `defineResourceLayout` now takes the layout directly.

**Before (0.25.0)**

```tsx
const { createResourceLayout } = defineBoundLayout({
  layout: {
    render: { default: () => <h1>Users</h1>, ...Loading },
  },
});
```

**After (1.0.0)**

```tsx
const { createResourceLayout } = defineBoundLayout({
  render: { default: () => <h1>Users</h1>, ...Loading },
});
```

## 3. Read the normalized resources accessor

`resources()` now returns normalized definitions, and the original declarations are on `resources.raw()`. `pick`, `omit` and `isResource` behave as before.

```tsx
resources();     // [{ value: 'users' }, { value: 'posts', subResources: [{ value: 'comments' }] }]
resources.raw(); // ['users', { value: 'posts', subResources: ['comments'] }]
```

## 4. New in 1.x

- `createResourceConfig.forResource('users', { component })` fragments you can spread into a config.
- 1.1.0: `asComposable` and the `namespace` option. 1.2.0: `createRenderState.fromState`.
- 1.3.0 and 1.4.0: the inspector and the Vite plugin. 1.5.0: `required` and `suppliedVia`.
- 1.6.0 and 1.6.1: optional layout names, `defineLayoutName.defineParts`, and the configuration-object form of `defineLayoutName`.

## Checklist

1. Convert each chained `createDefinedResourceLayout(...)` call.
2. Remove the `layout` wrapper from bound `defineResourceLayout` calls.
3. Update code that read `resources()` as raw declarations to use `resources.raw()`.
4. Run your type check.

## Next steps

- [Getting started](./getting-started.md)
- Next major: [v1 to v2](../v2/migration.md)
