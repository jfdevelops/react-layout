---
title: Quick start
description: Define a layout and render your first resource page.
order: 30
---

This page assumes you have [installed](./installation.md) React Layout and Zod.

## Define a layout

Declare your resources, the options each page can supply, and the markup that
renders those options:

```tsx
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { z } from 'zod';

const { createResourceLayout } = defineResourceLayout({
  resources: ['services', 'appointments'],
  options: {
    title: z.string(),
  },
  layout: {
    props: {
      include: {
        title: true,
      },
    },
    render: function PageLayout({ title, children }) {

      return (
        <main>
          <h1>{title}</h1>
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

`resources` defines the allowed resource keys. `options` describes values with
schemas. `props.include` selects the options used by the layout: `title: true`
requires a title when creating the page. `createResourceLayout` returns a React
component bound to that resource and its option values.

## Render the page

```tsx
import { ServicesPage } from './page-layout';

export function Services() {

  return (
    <ServicesPage>
      <p>Your service catalog goes here.</p>
    </ServicesPage>
  );
}
```

Keep data queries and resource-specific UI inside your page components.

## Next steps

- [TypeScript](./typescript.md): inferred types and type helpers.
- [Resources and layouts](./guides/resource-layouts.md): resources, naming, and shells.
- [Props and validation](./guides/props-and-validation.md): optional and component-time props.
- [Render states](./guides/render-states.md): loading, error, and other page variants.
- [Shared factory example](./guides/shared-factory.md): organize a larger application across files.
