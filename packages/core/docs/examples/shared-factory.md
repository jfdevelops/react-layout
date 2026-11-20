---
title: Shared factory
description: Create a shared factory and reusable page chrome, then render a resource page.
---

Start with one shared factory for a product area. This keeps resource names,
validation, UI primitives, and component naming consistent as pages grow.
The examples use ArkType, matching the reference application's approach.
Synchronous Standard Schema libraries such as Zod and Valibot also work.

## Install

Use React 18 or newer and Node `^20.19.0 || >=22.12.0` for tooling.

```bash
pnpm add @jfdevelops/react-layout arktype @jfdevelops/react-layout-adapter-arktype
```

The adapter provides schemas for React values. Keep `react` and `react-dom`
installed in your application. TypeScript preserves the resource names and
infers the props accepted by each created component.

## Bind the shared contract

Create `layout/base.tsx`. In a real application, `wrapWith` points to your own
layout, header, and content primitives; intrinsic elements keep this example
self-contained.

```tsx
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';
import { reactNode } from '@jfdevelops/react-layout-adapter-arktype';

export const adminLayoutDefinition = createDefinedResourceLayout({
  resources: ['services', 'appointments', 'dashboard'],
  options: {
    title: reactNode(),
  },
  composables: (create) => ({
    Layout: create({
      name: ({ resource, capitalize }) => `${capitalize(resource)}Layout`,
      wrapWith: 'main',
    }),
    Header: create({
      name: ({ resource, capitalize }) => `${capitalize(resource)}Header`,
      wrapWith: 'header',
    }),
    Content: create({
      name: ({ resource, capitalize }) => `${capitalize(resource)}Content`,
      wrapWith: 'section',
    }),
  }),
  props: {
    include: {
      title: true,
    },
  },
  name: ({ resource, capitalize }) => `${capitalize(resource)}Page`,
});

export const { createRenderState, defineResourceLayout, defineLazyDefaults } =
  adminLayoutDefinition;
```

`title: true` makes the title a required creation-time option. Values that change
with the current screen, such as toolbar contents, belong in component props.
Keep `adminLayoutDefinition` available as the source for devtools.

## Define the page chrome once

Create `layout/layout-state.tsx`. This is a render state called `Layout`, used as
a composable by the default and other shared states.

```tsx
import { reactNode } from '@jfdevelops/react-layout-adapter-arktype';
import { createRenderState } from './base';

export const layoutState = createRenderState({
  state: 'Layout',
  props: {
    include: {
      title: true,
    },
    custom: {
      toolbar: reactNode(),
      actions: reactNode(),
    },
  },
  render: function Layout({ title, toolbar, actions, children }, { composables }) {

    return (
      <composables.Layout>
        <composables.Header>
          <h1>{title}</h1>
          <div>{toolbar}</div>
          <div>{actions}</div>
        </composables.Header>
        <composables.Content>{children}</composables.Content>
      </composables.Layout>
    );
  },
});
```

This minimal contract requires callers to supply `toolbar` and `actions`; pass
`null` when a slot is empty. To allow omission, use a schema that explicitly
accepts `undefined`. See [Props and validation](../guides/props-and-validation.md).

## Assemble the default state

Create `layout/default-state.tsx`. Reuse the shared state's prop contract and
forward those props explicitly to its composable.

```tsx
import { createRenderState } from './base';
import { layoutState } from './layout-state';

export const defaultState = createRenderState({
  state: 'default',
  props: layoutState.Layout.props,
  composables: () => ({
    LayoutState: layoutState.asComposable(),
  }),
  render: function DefaultState(props, { composables }) {

    return <composables.LayoutState {...props} />;
  },
});
```

Create `layout/layout.tsx` to assemble the shared definition:

```tsx
import { defineResourceLayout } from './base';
import { defaultState } from './default-state';
import { layoutState } from './layout-state';

export const { createResourceLayout, createResourceConfig } = defineResourceLayout({
  render: {
    ...layoutState,
    ...defaultState,
  },
});
```

## Create and render a resource page

Create `services/page-layout.tsx`:

```tsx
import { createResourceLayout } from '../layout/layout';

export const ServicesPage = createResourceLayout({
  resource: 'services',
  title: 'Services',
});
```

Then use the page shell from `services/page.tsx`:

```tsx
import { ServicesPage } from './page-layout';

export function Services() {

  return (
    <ServicesPage toolbar={<input aria-label='Search services' />} actions={null}>
      <p>Your service catalog goes here.</p>
    </ServicesPage>
  );
}
```

The page owns its toolbar, actions, and data UI. The shared state owns their
placement and page chrome. Keep data queries in resource components so the
shared factory stays useful across the application.

Continue with [Resource routing](./resource-routing.md) to add
resource-local route states and lazy loading.

## Companion package versions

Choose the adapter for the schema library installed in your app. ArkType, Zod,
Valibot, and Effect adapters live in their corresponding
`@jfdevelops/react-layout-adapter-*` packages. Presets and devtools are optional;
install them when following [Composables and presets](../guides/composables-and-presets.md)
or [Develop and debug](../guides/develop-and-debug.md).

The core package installs its own validator, composable, and inspection
infrastructure. You do not need to add those packages for the workflow above.

## Agent skill

The package includes a skill for coding agents. Install it into your agent's
skill directory after adding the dependency:

```bash
npx skills add ./node_modules/@jfdevelops/react-layout/skills/build-react-layouts
```
