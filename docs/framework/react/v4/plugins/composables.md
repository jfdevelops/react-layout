---
title: Composables
description: Add named UI slots and preset prop contracts to a layout.
order: 20
---

Composables are named components available to a layout's render callback. Use them to wrap your own UI primitives, or install a preset to share a prop contract for common elements such as breadcrumbs and headers. You supply the markup and styling.

## Choose a package

| Package | Provides |
| --- | --- |
| `@jfdevelops/react-layout-composables` | Composable factories and validation helpers; the main library re-exports these APIs. |
| `@jfdevelops/react-layout-composable-navigation` | `createBreadcrumbComposable`, `createTabsComposable`; keyed navigation items. |
| `@jfdevelops/react-layout-composable-copy` | `createHeaderComposable`, `createMetaComposable`; title, description, and metadata. |
| `@jfdevelops/react-layout-composable-actions` | `createActionsComposable`; keyed actions with optional destinations, intents, and disabled state. |
| `@jfdevelops/react-layout-composable-access` | `createAccessComposable`; roles, permissions, and feature flag props interpreted by your callback. |
| `@jfdevelops/react-layout-composable-breadcrumb` | Compatibility re-export of the breadcrumb factory; use navigation for new code. |

These packages require React and React DOM 18 or newer. The main library already installs the composable infrastructure. Add only the presets you need:

```npm
npm i @jfdevelops/react-layout-composable-copy
```

```pnpm
pnpm add @jfdevelops/react-layout-composable-copy
```

```yarn
yarn add @jfdevelops/react-layout-composable-copy
```

```bun
bun add @jfdevelops/react-layout-composable-copy
```

## Add a preset

Spread the preset into `composables`, select its props with `props.include`, and render it from the layout:

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { createHeaderComposable } from '@jfdevelops/react-layout-composable-copy';

const { createResourceLayout } = defineResourceLayout({
  resources: ['services'],
  layout: {
    composables: () => ({
      ...createHeaderComposable(({ title, description }) => (
        <header><h1>{title}</h1><p>{description}</p></header>
      )),
    }),
    props: { include: { title: true, description: 'optional' } },
    render: function PageLayout({ title, description, children }, { composables }) {

      return (
        <main>
          <composables.Header title={title} description={description} />
          {children}
        </main>
      );
    },
  },
});

export const ServicesPage = createResourceLayout({
  resource: 'services',
  title: 'Services',
});
```

For slots without a preset contract, use the `create` callback with `name` and `wrapWith` to wrap an existing component. Use `defineComposableComponent` when writing your own reusable contract. Presets support `rename` and `extend`, and expose contract entry points under `/contract`.

See [Composables and presets](../guides/composables-and-presets.md) for custom contracts, prop inheritance, and extension examples. The access preset supplies a UI contract; your application implements the access checks.
