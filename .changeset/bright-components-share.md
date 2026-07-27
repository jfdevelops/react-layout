---
'@jfdevelops/react-layout': minor
---

Add scoped resource components with resource-component generics and optional
included props.

## Create one component for multiple resource layouts

`forResources` factories now expose `createComponent`. Props selected with
`include` become props on the shared component, including custom props already
defined for the resource layout:

```tsx
const createDirectoryLayout = createResourceLayout.forResources(
  'users',
  'admins',
);

const Directory = createDirectoryLayout.createComponent({
  props: {
    include: {
      title: true,
      actions: 'optional',
    },
  },
  render: ({ actions, children, title }) => (
    <section>
      <h1>{title}</h1>
      {actions}
      {children}
    </section>
  ),
});
```

Use `true` for a required included prop or `'optional'` to include it as an
optional prop. `children` is always optional in both the render callback and at
the component call site, so it never needs to be declared manually.

## Bind calls to a concrete resource component

Resource layout components now retain their resource as type-only metadata.
Pass the concrete component type to the shared component to verify that it
belongs to the selected resource scope:

```tsx
const UsersPage = createDirectoryLayout({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
});

<Directory<typeof UsersPage> title='Users'>
  User content
</Directory>;
```

For example, a component created for `posts` is rejected when `Directory` was
scoped to only `users` and `admins`.

The scoped factory also exposes a type-only `resources` property for extracting
the selected resource union. Its runtime value is `undefined`:

```tsx
type DirectoryResource = typeof createDirectoryLayout.resources;
// 'users' | 'admins'
```
