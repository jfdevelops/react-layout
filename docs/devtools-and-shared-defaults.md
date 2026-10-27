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
      segments: { required: false, suppliedVia: 'component' },
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

Use `required: true | false` to control whether a prop is required, and `suppliedVia: 'component' | 'config'` to select where its value is supplied. Optional component props still accept configuration-time defaults.

`visibility: 'required' | 'optional'` and `passthrough: 'component' | 'config'` remain supported as deprecated aliases until the next major version. The new and old names can be mixed during migration. If both names for the same setting are present, `required` and `suppliedVia` take precedence. The existing `true` and `'optional'` shorthand forms remain supported.

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

Declare custom string slots with `defineParts(...names)`, then provide the pattern to `namingFn`:

```tsx
const pageName = defineLayoutName
  .defineParts('section', 'suffix')
  .namingFn(({ resource, capitalize }, parts) =>
    `${parts.section}${capitalize(resource)}${parts.suffix}`,
  );

const userName = pageName({ section: 'Admin', suffix: 'Page' });
// When used for users: "AdminUsersPage"
```

Use an object to declare string and number slots. Both the pattern and supplied values suggest only the declared keys:

```tsx
const versionedName = defineLayoutName
  .defineParts({ section: 'string', version: 'number' })
  .namingFn(({ resource, capitalize }, parts) =>
    `${parts.section}${capitalize(resource)}V${parts.version}`,
  );

const userName = versionedName({ section: 'Admin', version: 2 });
// When used for users: "AdminUsersV2"
```

Numeric placeholders are `number | ''` inside the pattern because omission produces empty text. Plain interpolation works for either case; narrow before calling number-only methods:

```tsx
const formattedName = defineLayoutName
  .defineParts({ version: 'number' })
  .namingFn(({ resource, capitalize }, parts) => {
    const version = typeof parts.version === 'number'
      ? parts.version.toFixed(0)
      : '';
    return `${capitalize(resource)}V${version}`;
  });
```

Declared slots are optional; omitted values render as empty text. Supplied values must match their declared kind. The default shorthand still supports `prefix`, `beforeSuffix`, and `append`, with key completions for objects and callback returns.

The customization argument is optional and may be a plain object or a callback receiving the same runtime naming context. Defaults apply in order **factory → definition → creation call**. Standalone `defineResourceLayout` accepts `name` alongside `resources` and `layout`. If no naming default exists, `name` can be omitted: resource `'users'` generates `'UsersLayout'` at runtime and as an exact TypeScript literal. This fallback also applies to scoped builders and namespaces. An explicit component name overrides the definition default, which overrides the factory default, which overrides the generated resource name. Naming resolves when components are created; it does not change with mounted state.

## Local preview

Run `pnpm dev:basic-example`, then open `https://react-layout-example.localhost`. The example includes the floating inspector. `pnpm dev` and preview commands also use Portless; the core app is `https://react-layout.localhost`. Portless manages the actual server ports.
