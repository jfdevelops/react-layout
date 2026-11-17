# Breadcrumb composable

This package re-exports `createBreadcrumbComposable` from
[`@jfdevelops/react-layout-composable-navigation`](../composable-navigation),
which also provides tabs and the navigation contract both are built from. New
code should import from that package.

A segment is a label, or an object with `value` and optional `href`,
`isActive`, and `isDisabled`.

Pass a render callback to `createBreadcrumbComposable` to use the default
`segments` record. To add or replace definitions, use the object overload:

```tsx
import { z } from 'zod';

export const { Breadcrumb } = createBreadcrumbComposable({
  props: {
    segments: z.array(z.object({ label: z.string() })),
    separator: z.string(),
  },
  render: ({ segments, separator }) => (
    <nav>{segments.map((segment) => segment.label).join(separator)}</nav>
  ),
});
```

Definitions merge by key. Replacing `segments` replaces its inferred value type
and schema; other default definitions remain available. A callback can reuse
the defaults: `props: defaults => ({ ...defaults, separator: z.string() })`.
The original factory and its `.props` remain unchanged.

A definition is a Standard Schema from any schema library, or a validator
function that receives the value as `unknown`, returns the validated value,
and throws to reject it. The default
`segments` definition is a validator function; its type is exported as
`BreadcrumbSegmentsSchema`.

The object overload also accepts `name`, `wrapWith`, and `rename` overrides.
`rename` gives a default prop a new name, and optionally a new definition:

```tsx
createBreadcrumbComposable({
  rename: { segments: 'crumbs' },
  render: ({ crumbs }) => <AppBreadcrumb segments={crumbs} />,
});
```

Use `createBreadcrumbComposable.extend({ ... })` with the same options, minus
`render`, to derive a reusable factory. This API is available on every factory
returned by `defineComposableComponent`.
