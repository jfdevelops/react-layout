---
title: Composables
description: Share named slots across pages, use the breadcrumb preset, and define your own composable with typed props.
order: 60
---

A composable is a named slot component such as `Layout`, `Title` or `Breadcrumb`. Pages
render the same slots, so your markup stays consistent. A **preset** composable also
ships its props, so a page supplies the values and your render callback supplies the
markup.

In v1 the only published preset is the breadcrumb. The navigation, copy, actions and
access presets, `rename`, `extend`, `getSchema` and validator-function props arrived in
v3. See [the v3 guide](../../v3/guides/composables-and-presets.md).

In this guide you will:

- declare composables with `create`
- add the breadcrumb preset
- define your own composable

## Declare slots

`layout.composables` receives a resource-aware `create` function. Each call returns a
slot with a stable component name.

```tsx
composables: (create) => ({
  Layout: create({ name: 'PageLayout' }),
  Title: create({ name: 'PageTitle' }),
}),
```

`name` is a string or a callback receiving `{ resource, capitalize }`. The render callback
gets the slots as `composables`.

## Add the breadcrumb preset

```npm
npm i @jfdevelops/react-layout-composable-breadcrumb@0.2.10
```

```pnpm
pnpm add @jfdevelops/react-layout-composable-breadcrumb@0.2.10
```

```yarn
yarn add @jfdevelops/react-layout-composable-breadcrumb@0.2.10
```

```bun
bun add @jfdevelops/react-layout-composable-breadcrumb@0.2.10
```

The package exports `createBreadcrumbComposable`. Pass it a render callback and spread
the result into `composables`.

```tsx
import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-breadcrumb';

composables: (create) => ({
  Layout: create({ name: 'Layout' }),
  ...createBreadcrumbComposable(({ segments }) => (
    <nav>{Object.keys(segments).join(' / ')}</nav>
  )),
}),
props: { include: { segments: true } },
```

`segments` is a record keyed by a stable id. Each value is a string, or an object with
`value` and an optional `isActive`.

`createBreadcrumbComposable` is itself built with `defineComposableComponent`, the same
function you use for your own composables (next section).

## Define your own composable

`defineComposableComponent` takes a `name` and `props`. In v1 each prop is a `createProp`
definition. It returns a factory you call with a
render callback.

```tsx
const createBadgeComposable = defineComposableComponent({
  name: 'Badge',
  props: {
    tone: createProp.string().enum(['info', 'warning']),
  },
});

const Badge = createBadgeComposable(({ tone }) => <span>{tone}</span>);

createBadgeComposable.props; // the prop definitions
Badge.Badge.displayName; // 'Badge'
```

Presets in one layout that declare the same prop receive the same page value. In v1 two
different definitions for one prop do not raise an error: the last one silently wins.
v3.2.0 made that an error (`ConflictingPresetPropError`).

## Next steps

- [Props and validation](./props-and-validation.md)
- [Develop and debug](./develop-and-debug.md) shows composables in the inspector
- [API reference](../reference/api.md#composable-exports)
