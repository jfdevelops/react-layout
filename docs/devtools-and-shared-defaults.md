# Devtools and shared defaults

The optional [React devtools](../packages/devtools-react/README.md) accept a factory or individual definition. The implementation is split between a framework-independent `@jfdevelops/react-layout-devtools-core` and `@jfdevelops/react-layout-devtools-react`, which exports `ReactLayoutDevtools` (animated floating launcher) and `ReactLayoutDevtoolsContent` (embeddable graph, including TanStack Devtools).

## Shared prop contracts

`createDefinedResourceLayout` accepts the same `props: { include, custom }` contract as a layout. `options` declares schemas; `props.include` determines where their values must be supplied. These are contracts, not default data values.

```tsx
const layouts = createDefinedResourceLayout({
  resources: ['users', 'settings'],
  options: { title: createProp.string() },
  composables: () => ({ ...Breadcrumb }),
  props: {
    include: {
      title: true,
      segments: { visibility: 'optional', passthrough: 'component' },
    },
  },
});

const definition = layouts.defineResourceLayout({
  render: (_props, { composables }) =>
    <composables.Breadcrumb segments={{ users: 'Users' }} />,
});

const Users = definition.createResourceLayout({
  resource: 'users', name: 'Users', title: 'Users',
}); // segments is not required here
```

Merge precedence is **factory → layout → state**. Each `include` or `custom` key is merged independently. The closer declaration replaces the entire entry for that prop. Omitted keys inherit; an empty object preserves the defaults. State callbacks created separately with `createRenderState` are typed against their factory contract; changing a layout contract must remain compatible with those callbacks. Inline state callbacks receive the effective layout/state contract.

## Naming

A creation-time `name` can be a string or callback. Callbacks receive the selected literal `resource`, typed available state names in `states`, and the library's literal-preserving `capitalize` function.

```tsx
createResourceLayout({
  resource: 'users',
  name: ({ resource, capitalize }) => `${capitalize(resource)}Page`,
});
```

Use `defineLayoutName` to preserve resource-specific literal names in a reusable convention. The convention places the optional `prefix`, `beforeSuffix`, and `append` slots wherever desired:

```tsx
const pageName = defineLayoutName(({ resource, capitalize }, parts) =>
  `${parts.prefix}${capitalize(resource)}${parts.beforeSuffix}ResourceLayout${parts.append}`,
);
const layouts = createDefinedResourceLayout({
  resources: ['users', 'settings'],
  name: pageName(),
});
const definition = layouts.defineResourceLayout({ render: () => <div /> });
const Users = definition.createResourceLayout({ resource: 'users' });
// Users.displayName: "UsersResourceLayout"

const Settings = definition.createResourceLayout({
  resource: 'settings',
  name: pageName({ prefix: 'Admin', beforeSuffix: 'Detail', append: 'Preview' }),
});
// "AdminSettingsDetailResourceLayoutPreview"
```

The customization argument is optional and may be a plain object or a callback receiving the same runtime naming context. Defaults apply in order **factory → definition → creation call**. Standalone `defineResourceLayout` accepts `name` alongside `resources` and `layout`. If no naming default exists, the direct creation call still requires `name`. Naming resolves when components are created; it does not change with mounted state.

## Local preview

Run `pnpm dev:basic-example`, then open `https://react-layout-example.localhost`. The example includes the floating inspector. `pnpm dev` and preview commands also use Portless; the core app is `https://react-layout.localhost`. Portless manages the actual server ports.
