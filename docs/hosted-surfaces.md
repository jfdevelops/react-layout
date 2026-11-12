# Hosted surfaces

> Status: implemented.
>
> Goal: type the product relationship between a root layout family and
> structurally different hosted families (side panes, settings overlays)
> without replacing the existing multi-file `createDefinedResourceLayout`
> workflow.

## Problem

`defineResourceLayout` / `createDefinedResourceLayout` model **shared chrome
and a shared prop contract**. Surfaces with a different structural contract
correctly get their own definition (page shell vs create/detail pane vs
settings frame).

What the library does not model today is the **host relationship** between
those families. Apps invent it by convention:

```ts
// Host resource is typed on the page factory.
const createPage = createResourceLayout.forResource({
  resource: 'purposes',
});

// Pane "resources" are modes — host identity lives only in a display name.
export const PurposesPageCreatePane = resourcePaneLayout.createResourceLayout({
  resource: 'create',
  name: 'PurposesPageCreatePane',
  title: 'Add purpose',
});
```

Subresources are the wrong tool for this: they describe hierarchy inside one
chrome, not a different chrome attached to a host resource.

## Design principles

1. Keep today's multi-file usage as the ideal path.
2. Offer a one-shot bag API for smaller apps, same types underneath.
3. Reuse the library's HOF vocabulary (`forResource` / `forResources`) instead
   of a new builder chain for hosting.
4. Every surface uses the same normalized slots; only values differ.
5. Host typing flows from `createDefinedResourceLayout`, not from stringly
   surface names across files.

## Normalized surface contract

Every surface definition uses the same slots:

| Slot                                                     | Meaning                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `resources`                                              | Addressable ids for **this** surface (domain resources, pane modes, settings sections, …) |
| `host`                                                   | Optional attachment to a host layout's resources (`resources` subset or `'*'`)            |
| `options` / `composables` / `props` / `render` / `shell` | Existing layout contract                                                                  |

No per-surface special keys such as `modes`, `kind`, or ad-hoc relationship
fields. A pane mode is a resource id on the pane surface. Overlay behavior
falls out of declaring `host` and omitting persistent `shell`.

## Split / multi-file API (ideal)

`defineResourceSurface` is returned from `createDefinedResourceLayout` so host
resource literals are in scope.

```ts
// admin/-utils/layout/base.tsx
export const adminLayoutDefinition = createDefinedResourceLayout({
  resources: [
    'appointments',
    'payments',
    'locations',
    'services',
    'purposes',
    'settings',
    {
      value: 'builder',
      subResources: ['homepage'],
    },
    'dashboard',
    // ...
  ],
  options: {
    title: reactNode(),
    description: reactNode().optional(),
  },
  composables: (create) => ({
    // page chrome composables
  }),
});

export const {
  defineResourceLayout,
  createRenderState,
  defineResourceSurface,
  defineLazyDefaults,
} = adminLayoutDefinition;
```

The root page family keeps using `defineResourceLayout` as today. Hosted
families call `defineResourceSurface`:

```ts
// admin/$resource/-pane/layout.tsx
import { defineResourceSurface } from '../../-utils/layout/base';

export const { createRenderState, defineResourceLayout } =
  defineResourceSurface({
    resources: ['create', 'detail', 'edit'],
    host: {
      resources: [
        'appointments',
        'locations',
        'services',
        'purposes',
        'payments',
        'logs',
        'templates',
        'team',
        'documents',
        'automations',
      ], // must be ⊆ admin resources
    },
    options: {
      title: reactNode(),
    },
    composables: (create) => ({
      // pane chrome composables
    }),
  });

export const resourcePaneLayout = defineResourceLayout({
  render: {
    // pane render states
  },
});
```

```ts
// admin/$resource/-settings/layout.tsx
import { defineResourceSurface } from '../../-utils/layout/base';

export const { createRenderState, defineResourceLayout } =
  defineResourceSurface({
    resources: [
      'general',
      'booking',
      'payments',
      'channels',
      'notifications',
      'exports',
      'launch',
      'limits',
    ],
    host: {
      resources: '*', // openable over any host resource
    },
    options: {
      title: reactNode(),
      description: reactNode(),
    },
  });
```

Auth and other unrelated product areas stay on a standalone
`defineResourceLayout` / `createDefinedResourceLayout` with no `host`.

### Why there is no `host.surface` field in the split API

Across files, the host is the `createDefinedResourceLayout` result that
provided `defineResourceSurface`. Passing `surface: 'page'` or a sibling
variable is unnecessary; the function binding already carries the host
resource union.

String surface keys are reserved for the one-shot bag below, where siblings
are declared in one object.

## Consuming hosted layouts: conditional `forResource` option

Do not add a `.hostedBy(...).forResource(...)` builder chain. Extend the
existing `forResource` options object. `hostedBy` appears in the type **only**
when the layout was created through `defineResourceSurface`:

```ts
// admin/$resource/-purposes/pages-config.ts
import { createResourceLayout } from '../../-utils/layout/layout';
import { resourcePaneLayout } from '../-pane/layout';

const createPage = createResourceLayout.forResource({
  resource: 'purposes',
});

export const PurposesPage = createPage({
  title: 'Purposes',
  description: 'Organize what your client messages are used for.',
});

export const PurposesPageCreatePane =
  resourcePaneLayout.createResourceLayout.forResource({
    resource: 'create',
    hostedBy: 'purposes',
  })({
    title: 'Add purpose',
  });

export const PurposesPageDetailPane =
  resourcePaneLayout.createResourceLayout.forResource({
    resource: 'detail',
    hostedBy: 'purposes',
  })({
    title: 'Edit purpose',
  });
```

Direct creation accepts the same conditional field:

```ts
resourcePaneLayout.createResourceLayout({
  resource: 'create',
  hostedBy: 'purposes',
  title: 'Add purpose',
});
```

### Conditional typing (conceptual)

```ts
type ForResourceOptions<Layout> = Layout extends HostedLayout<
  infer HostResources
>
  ? {
      resource: LayoutResources<Layout>;
      hostedBy: HostResources;
    }
  : {
      resource: LayoutResources<Layout>;
      // hostedBy is not part of the type
    };
```

Rules:

- Root page `forResource({ resource: 'purposes' })` rejects `hostedBy`.
- Hosted pane `forResource({ resource: 'create' })` requires `hostedBy` when
  `host` was declared.
- `hostedBy` must be assignable to the surface's `host.resources` (or any host
  resource when `host.resources` is `'*'`).

`forResources` follows the same rule when narrowing a hosted factory.

## One-shot bag API

Smaller apps may declare the graph in one call. Internally this is sugar over
`createDefinedResourceLayout` + `defineResourceSurface`:

```ts
export const adminSurfaces = defineResourceSurfaces({
  page: {
    resources: [
      'appointments',
      'payments',
      'locations',
      // ...
      {
        value: 'builder',
        subResources: ['homepage'],
      },
      'dashboard',
    ],
    options: {
      title: reactNode(),
      description: reactNode().optional(),
    },
    composables: adminComposables,
    shell: {
      // persistent sidebar / provider — withLayout equivalent
    },
    render: {
      // page states
    },
  },
  pane: {
    resources: ['create', 'detail', 'edit'],
    host: {
      surface: 'page', // string key OK here — siblings share one object
      resources: [
        'appointments',
        'locations',
        'services',
        'purposes',
        'payments',
        'logs',
        'templates',
        'team',
        'documents',
        'automations',
      ],
    },
    options: {
      title: reactNode(),
    },
    composables: paneComposables,
    props: {
      include: {
        title: true,
        segments: 'optional',
      },
      custom: {
        children: reactNode(),
        actions: reactNode().optional(),
        close: reactNode().optional(),
        status: reactNode().optional(),
      },
    },
    render: {
      // pane states
    },
  },
  settings: {
    resources: [
      'general',
      'booking',
      'payments',
      'channels',
      'notifications',
      'exports',
      'launch',
      'limits',
    ],
    host: {
      surface: 'page',
      resources: '*',
    },
    options: {
      title: reactNode(),
      description: reactNode(),
    },
    render: {
      // settings frame states
    },
  },
});
```

Apps that already split files may still register completed layouts:

```ts
export const adminSurfaces = defineResourceSurfaces({
  page: adminPage,
  pane: resourcePaneLayout,
  settings: settingsLayout,
});
```

## How the styles relate

```text
defineResourceSurfaces({ page, pane, settings })
        ↕ same types
createDefinedResourceLayout(...)
  ├─ defineResourceLayout          → root family
  └─ defineResourceSurface(...)    → hosted family
        └─ createResourceLayout.forResource({ resource, hostedBy })
```

| Style           | Entrypoint                                              | Host reference                    |
| --------------- | ------------------------------------------------------- | --------------------------------- |
| One-shot        | `defineResourceSurfaces`                                | `host.surface: 'page'` string key |
| Multi-file      | `createDefinedResourceLayout` → `defineResourceSurface` | Implicit via returned helper      |
| Feature modules | `forResource` / `createResourceLayout`                  | Conditional `hostedBy` option     |

## Out of scope for v1

- Replacing `withLayout` / `Shell` (root persistent chrome stays as today).
- Folding panes into the page renderer with flags.
- Modeling auth as a hosted surface of admin.
- Router search-param schemas (apps may later derive unions from
  `host.resources` / surface `resources`, but that is not required for v1).

## Implementation sketch

1. Extend `createDefinedResourceLayout` to return `defineResourceSurface`.
2. `defineResourceSurface` reuses the existing defined-layout machinery with a
   typed `host.resources` constraint against the parent resource union.
3. Mark hosted layout results so `forResource` / `createResourceLayout` option
   types conditionally require `hostedBy`.
4. Add `defineResourceSurfaces` as compositional sugar over (1)–(2).
5. Optional follow-ups: inspection edges for host → surface in devtools, and
   helpers that export resource/mode unions for route validation.
