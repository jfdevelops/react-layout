# Breadcrumb composable

Pass a render callback to `createBreadcrumbComposable` to use the default
`segments` record. To add or replace definitions, use the object overload:

```tsx
export const { Breadcrumb } = createBreadcrumbComposable({
  props: {
    segments: createProp.array(
      createProp.object({ label: createProp.string() }),
    ),
    separator: createProp.string(),
  },
  render: ({ segments, separator }) => (
    <nav>{segments.map((segment) => segment.label).join(separator)}</nav>
  ),
});
```

Definitions merge by key. Replacing `segments` replaces its inferred value type
and validator; other default definitions remain available. A callback can reuse
the defaults: `props: defaults => ({ segments: defaults.segments.optional() })`.
The original factory and its `.props` remain unchanged.

The object overload also accepts `name` and `wrapWith` overrides. This API is
available on every factory returned by `defineComposableComponent`.
