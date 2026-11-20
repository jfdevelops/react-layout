---
title: Getting started
description: Install React Layout, define a layout, and render your first resource page.
---

## Install

React Layout requires React 18 or newer. Tooling requires Node
`^20.19.0 || >=22.12.0`.

```bash
pnpm add @jfdevelops/react-layout zod
```

The examples use Zod. Any synchronous Standard Schema library can describe your
options. TypeScript infers resource keys and component props from your definition.

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

- [Resources and layouts](./guides/resource-layouts.md): resources, naming, and shells.
- [Props and validation](./guides/props-and-validation.md): optional and component-time props.
- [Render states](./guides/render-states.md): loading, error, and other page variants.
- [Shared factory example](./examples/shared-factory.md): organize a larger application across files.

## Companion package versions

For React node and element schemas, add the adapter for your schema library:
`@jfdevelops/react-layout-adapter-zod`, `-arktype`, `-valibot`, or `-effect`.
Check the chosen package's peer dependencies against your schema library version.
Presets and devtools are optional; their guides show the required installs.
