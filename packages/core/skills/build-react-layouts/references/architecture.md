# Application Architecture

## Contents

- Central layout definition
- Shared layout contract
- Semantic composables
- Preset composables
- Persistent application shell
- Secondary layout families
- Feature organization

## Create a central layout definition

Create one central definition for resources that share the same application
shell. Export the generated helpers from that module:

```tsx
import {
  createProp,
  defineResourceLayout,
} from '@jfdevelops/react-layout';

export const {
  createResourceConfig,
  createResourceLayout,
  createResourceLinks,
} = defineResourceLayout({
  resources: ['appointments', 'locations', 'services', 'settings'],
  options: {
    title: createProp.component({ type: 'ReactNode' }).optional(),
  },
  layout: {
    // Define the shared contract here.
  },
});
```

Import these generated helpers in feature modules instead of defining parallel
resource lists or rebuilding the application shell.

## Define the shared layout contract

Separate definition-time configuration from render-time component props:

```tsx
layout: {
  props: {
    include: {
      title: true,
      segments: true,
    },
    custom: {
      children: createProp.component({ type: 'ReactNode' }),
      actions: createProp.component({ type: 'ReactNode' }).optional(),
      showHeader: createProp.boolean().optional(),
    },
  },
}
```

Use included props for values that describe the generated page. Use custom
props for content supplied when the generated page component is rendered.

Default optional behavioral props in the renderer:

```tsx
render: (
  { children, actions, showHeader = true, segments },
  { composables },
) => {
  // Render the shared shell.
}
```

## Create semantic composables

Define named layout regions through the scoped `create` function:

```tsx
composables: (create) => ({
  Layout: create({
    name: ({ capitalize, resource }) =>
      `${capitalize(resource)}Layout`,
    wrapWith: AppLayout,
  }),
  Header: create({
    name: ({ capitalize, resource }) =>
      `${capitalize(resource)}Header`,
    wrapWith: AppHeader,
  }),
  Content: create({
    name: ({ capitalize, resource }) =>
      `${capitalize(resource)}Content`,
    wrapWith: AppContent,
  }),
  ResourceHeaderActions: create({
    name: ({ capitalize, resource }) =>
      `${capitalize(resource)}ResourceHeaderActions`,
    wrapWith: AppResourceHeaderActions,
  }),
}),
```

Make the composable name communicate the region's role. Use `wrapWith` to
connect that role to the application's design-system implementation.

## Merge preset composables

Merge optional preset composables into the same semantic map:

```tsx
import {
  createBreadcrumbComposable,
} from '@jfdevelops/react-layout-composable-breadcrumb';

composables: (create) => ({
  Layout: create({ name: 'Layout', wrapWith: AppLayout }),
  ...createBreadcrumbComposable(({ segments }) => (
    <AppBreadcrumb segments={segments} />
  )),
})
```

Include the preset's required values in `layout.props.include`. Keep
presentation in the preset renderer and segment definitions in resource page
configuration.

## Persist the application shell across navigation

Plain `defineResourceLayout` wraps every page in its own `createResourceLayout`
component. Navigating between resources unmounts one page component and mounts
another, so the chrome that `render` produces — a sidebar, a header,
subscriptions, observers — is rebuilt on every navigation.

Use `defineResourceLayout.withLayout` when that rebuild is a problem. It returns
a `Shell` component in addition to the usual helpers:

```tsx
export const {
  createResourceConfig,
  createResourceLayout,
  createResourceLinks,
  Shell,
} = defineResourceLayout.withLayout({
  resources: ['appointments', 'locations', 'services', 'settings'],
  options: {
    title: createProp.component({ type: 'ReactNode' }).optional(),
  },
  shell: {
    composables: (create) => ({
      Layout: create({
        name: ({ capitalize, resource }) =>
          resource ? `${capitalize(resource)}Shell` : 'Shell',
        wrapWith: AppLayout,
      }),
      ...createBreadcrumbComposable(({ segments }) => (
        <AppBreadcrumb segments={segments} />
      )),
    }),
    props: {
      include: { segments: true },
    },
    render: ({ segments }, { composables, children }) => (
      <composables.Layout>
        <AppSidebar />
        <composables.Breadcrumb segments={segments} />
        <main>{children}</main>
      </composables.Layout>
    ),
  },
  layout: {
    // Optional under `withLayout`. Give a resource its own header or actions
    // here, or omit `render` entirely and the page renders its children into
    // the shell's outlet.
    props: {
      custom: {
        children: createProp.component({ type: 'ReactNode' }),
        actions: createProp.component({ type: 'ReactNode' }).optional(),
      },
    },
    render: ({ children, actions }, { composables }) => (
      <composables.ResourceLayout>
        {actions && (
          <composables.ResourceHeaderActions>
            {actions}
          </composables.ResourceHeaderActions>
        )}
        {children}
      </composables.ResourceLayout>
    ),
  },
});
```

Mount `Shell` once, in the parent route, wrapping the router outlet:

```tsx
function AdminRoute() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
```

The shell's `render` context matches a per-resource `render` context
(`composables`, `resources`, `name`) plus `children` — the outlet subtree, which
you place where page content belongs. `resource` and `resources.current` are
possibly `undefined`: the shell outlives any single page, so the current
resource is whatever the mounted page reports.

A page created by `createResourceLayout` reports its resource to the shell
automatically, so resource-scoped composable names still resolve. Pass the
always-optional `resource` prop to `<Shell>` for routes that render non-library
content, or in tests and stories:

```tsx
<Shell resource="appointments">{children}</Shell>
```

Keep genuinely shared, stateful chrome (sidebar, header, breadcrumb container)
in `shell`. Keep anything that varies per resource in `layout.render`. Anything
placed in `shell` cannot read per-page render props.

## Create secondary layout families

Create another `defineResourceLayout` when a surface has a distinct structural
contract. A side pane is not merely a variation of the main page shell:

```tsx
export const resourcePaneLayout = defineResourceLayout({
  resources: ['create', 'detail'],
  options: {
    title: createProp.component({ type: 'ReactNode' }),
  },
  layout: {
    props: {
      include: {
        title: true,
      },
      custom: {
        children: createProp.component({ type: 'ReactNode' }),
      },
    },
    render: function Render({ children, title }) {
      return (
        <Panel>
          <PanelHeader>
            <PanelTitle>{title}</PanelTitle>
          </PanelHeader>
          <PanelContent>{children}</PanelContent>
        </Panel>
      );
    },
  },
});
```

Do not overload the main page layout with pane-specific flags and conditional
branches.

## Organize by feature

Keep the general layout definition centralized and concrete page definitions
beside their feature:

```text
admin/
├── -utils/
│   └── layout.tsx
├── $resource/
│   ├── -page-config.tsx
│   ├── -pane/
│   │   └── layout.tsx
│   ├── -appointments/
│   │   └── pages-config.ts
│   ├── -locations/
│   │   └── pages-config.ts
│   └── index.tsx
└── route.tsx
```
