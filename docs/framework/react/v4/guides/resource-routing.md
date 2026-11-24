---
title: Resource routing
description: Organize shared chrome, resource states, lazy route modules, and resource config fragments.
order: 110
---

Build on the files from [Shared factory](./shared-factory.md). This structure is adapted from the admin layouts in [glammed-by-arielie PR #65](https://github.com/jfdevelops/glammed-by-arielie/pull/65). It preserves that application's separation of shared chrome, resource-specific UI, and route configuration while using the current v4 API.

## Keep dependencies flowing toward the shared factory

```text
layout/
  base.tsx                 # Resources, schemas, composables, naming
  layout-state.tsx         # Shared chrome and slot props
  default-state.tsx        # Shared default wrapper
  loading-state.tsx        # Shared loading wrapper, if needed
  error-state.tsx          # Shared error wrapper, if needed
  not-found-state.tsx      # Shared not-found wrapper, if needed
  layout.tsx               # Assembled shared states and page/config factories
  code-loading.tsx         # Lightweight module-download fallback
  code-error.tsx           # Module-download failure and retry
  lazy-defaults.tsx        # Registers fallbacks before lazy resources are created
services/
  page-layout.tsx          # ServicesPage from the shared page factory
  page.tsx                 # Data UI inside ServicesPage
  routing/
    states/
      default.tsx
      loading.tsx
      error.tsx
      not-found.tsx
    layout.tsx             # Assembles services route states; one page export
    config.tsx             # Lazy proxy and services config fragment
page-config.tsx            # Combines resource fragments
```

The names here are illustrative. Keep route-private files beside their route using your router's directory conventions. The reference app uses TanStack Router's `-utils` and resource-local `utils/routing` folders.

`base.tsx` must not import resource pages. Shared state modules import `base.tsx`; resource modules can import both. This lets lazy route modules depend on shared chrome without making the shared factory eagerly import the whole app.

## Share a contract across page variants

A shared `Loading`, `Error`, or `NotFound` wrapper can follow the same pattern as `default-state.tsx`: reuse `layoutState.Layout.props`, register `layoutState.asComposable()`, and forward props to it. Spread each resulting fragment into the shared definition in `layout.tsx`.

These shared variants give resource pages the same header and toolbar slots. They do not decide when a query is loading or what constitutes a missing record. Each resource makes those decisions and supplies its own skeletons and recovery UI.

When using `asComposable()` without an inclusion contract, pass the required props explicitly. To inherit selected props instead, use `asComposable({ props: { include: { title: true } } })`. See [Render states](./render-states.md) for inheritance and `fromState`.

## Define resource-local route states

Create `services/routing/states/default.tsx`:

```tsx
import { createRenderState } from '../../../layout/base';
import { Services } from '../../page';

export const defaultState = createRenderState({
  state: 'default',
  render: function ServicesDefault() {

    return <Services />;
  },
});
```

Create `services/routing/states/loading.tsx`. The loading state uses the same resource page shell, preserving its heading and slot positions:

```tsx
import { createRenderState } from '../../../layout/base';
import { ServicesPage } from '../../page-layout';

export const loadingState = createRenderState({
  state: 'Loading',
  render: function ServicesLoading() {

    return (
      <ServicesPage toolbar={<span>Loading search…</span>} actions={null}>
        <p role='status'>Loading services…</p>
      </ServicesPage>
    );
  },
});
```

Use the same approach for error and not-found views. Replace the body and the slots that depend on unavailable data, retaining the shared page shell. Add `Detail`, `DetailLoading`, `DetailError`, and `DetailNotFound` states when the resource has a distinct detail route.

## Assemble one resource module

Create `services/routing/layout.tsx`:

```tsx
import { defineResourceLayout } from '../../layout/base';
import { defaultState } from './states/default';
import { loadingState } from './states/loading';

const { createResourceLayout } = defineResourceLayout({
  render: {
    ...defaultState,
    ...loadingState,
  },
});

export const ResourcePage = createResourceLayout({
  resource: 'services',
  title: 'Services',
});
```

The module must export exactly one library-created page for lazy discovery. Keep its helper components and state exports in their own modules. The outer `ResourcePage` selects route states; `ServicesPage` inside those states supplies the visible shared chrome. Avoid wrapping the route assembly in another copy of the chrome, which would produce duplicate headings and toolbars.

## Register module-download defaults

Create `layout/code-loading.tsx`:

```tsx
export function ResourceCodeLoading({ resource }: { resource: string }) {

  return <p role='status'>Opening {resource}…</p>;
}
```

Create `layout/code-error.tsx`:

```tsx
import { defineLazyDefaults } from './base';

export const ResourceCodeError = defineLazyDefaults.createRenderState({
  state: 'Error',
  render: function ResourceCodeError({ error, retry }) {

    return (
      <div role='alert'>
        <p>{error.message}</p>
        <button onClick={retry}>Try again</button>
      </div>
    );
  },
});
```

Create `layout/lazy-defaults.tsx`:

```tsx
import { defineLazyDefaults } from './base';
import { ResourceCodeError } from './code-error';
import { ResourceCodeLoading } from './code-loading';

defineLazyDefaults({
  Loading: ResourceCodeLoading,
  Error: ResourceCodeError,
});
```

Import this module before constructing any lazy proxies. The reference app imports it from the shared `layout.tsx`. The next example imports it explicitly so initialization order is visible.

Download fallbacks must be available before the resource module loads. Keep them lightweight and independent of the resource module and its data queries. A resource's `Loading` state renders after its code becomes available; it can use resource-specific skeletons. A module-download `Error` handles import failures; ordinary query and render errors belong to the application's boundaries.

## Create and combine config fragments

Create `services/routing/config.tsx`:

```tsx
import '../../layout/lazy-defaults';
import { defineResourceLayout } from '../../layout/base';
import { createResourceConfig } from '../../layout/layout';

const Page = defineResourceLayout.lazy({
  resource: 'services',
  load: () => import('./layout'),
});

export const servicesConfig = createResourceConfig.forResource('services', {
  component: <Page />,
  pendingComponent: <Page.Loading />,
});
```

Once the corresponding states exist, add `errorComponent: <Page.Error />` and `notFoundComponent: <Page.NotFound />`. A `detail` branch can map to the `Page.Detail*` states. Only reference states declared by the loaded module.

Combine fragments in `page-config.tsx`:

```tsx
import { createResourceConfig } from './layout/layout';
import { servicesConfig } from './services/routing/config';

export const resourcePageConfig = createResourceConfig({
  ...servicesConfig,
});
```

Add each new resource's fragment here. Keep the resource's state assembly and lazy import beside that resource rather than growing a central render switch.

## Connect your router

A config stores React elements in named slots. Your router adapter selects a resource and slot and returns the element:

```tsx
import { resourcePageConfig } from './page-config';

export function ServicesRoute() {

  return resourcePageConfig.getComponent({ resource: 'services' });
}

export function ServicesPendingRoute() {

  return resourcePageConfig.getComponent({
    resource: 'services',
    component: 'pendingComponent',
  });
}
```

Register these functions with the router's page and pending hooks. Use the same pattern for error and not-found slots after adding them to the config. Validate a dynamic URL parameter against your declared resources before passing it into a lookup; the router still owns URL parsing, loaders, redirects, and boundaries.

For many routes, [Route components and renderers](./route-components.md) shows how to share this adapter with `createRenderer`. Its v4 factory takes one object: `renderServices({ component: 'pendingComponent' })`.

## Keep data boundaries close to the content

The reference application's services page supplies search, filters, and actions to its shell and places Suspense and error boundaries around independently loading content. This allows one section to recover while the page chrome and other controls remain usable. The layout library supplies composition and validation; your query library and router drive data states.

Use [Hosted surfaces](./hosted-surfaces.md) when a detail or create pane needs a separate layout family attached to a host resource. Use a separate root factory for a structurally different area, such as an authentication card layout.
