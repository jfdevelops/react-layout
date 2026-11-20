---
title: Composables
description: Share named slots across pages, use the breadcrumb preset, and define your own composable with typed props.
order: 60
---

A composable is a named slot component such as `Layout`, `Title` or `Breadcrumb`. Pages
render the same slots, so your markup stays consistent. A **preset** composable also
ships its props, so a page supplies the values and your render callback supplies the
markup.

In v2 the only published preset is the breadcrumb. The navigation, copy, actions and
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

```sh
pnpm add @jfdevelops/react-layout-composable-breadcrumb@0.2.14
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

To add or replace definitions, use the object overload. Definitions merge by key.
Replacing `segments` replaces its inferred value type and validator. A callback can reuse
the defaults: `props: (defaults) => ({ segments: defaults.segments.optional() })`. The
object overload also accepts `name` and `wrapWith`, and the original factory and its
`.props` are unchanged.

## Define your own composable

`defineComposableComponent` takes a `name` and `props`. In v2 each prop is a `createProp`
definition or a Standard Schema (2.6.0 and later). It returns a factory you call with a
render callback.

```tsx
const createBadgeComposable = defineComposableComponent({
  name: 'Badge',
  props: {
    tone: z.enum(['info', 'warning']),
  },
});

const Badge = createBadgeComposable(({ tone }) => <span>{tone}</span>);

createBadgeComposable.props; // the prop definitions
Badge.Badge.displayName; // 'Badge'
```

Presets in one layout that declare the same prop receive the same page value. In v2 two
different definitions for one prop do not raise an error: the last one silently wins.
v3.2.0 made that an error (`ConflictingPresetPropError`).

## Composables on bound pages

A page bound with `asHOF()` exposes `makeComposable` when the layout defines composables
(added in 2.0.0). See [Route components](./route-components.md).

## Next steps

- [Props and validation](./props-and-validation.md)
- [Develop and debug](./develop-and-debug.md) shows composables in the inspector
- [API reference](../reference/api.md#composable-exports)
