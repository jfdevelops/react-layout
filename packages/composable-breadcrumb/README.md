# Breadcrumb composable

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

Definitions are Standard Schemas, so any schema library works. The default
`segments` schema is exported as the `BreadcrumbSegmentsSchema` type.

The object overload also accepts `name` and `wrapWith` overrides. This API is
available on every factory returned by `defineComposableComponent`.
