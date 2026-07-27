---
'@jfdevelops/react-layout': minor
---

Add resource-specific renders and an automatic resource prop to scoped
components.

## Define custom renders by resource

Each resource selected by `forResources` can define its own render entry on the
`createComponent` options. The main render callback receives those renders as
capitalized components in its second argument:

```tsx
const createResourcePage = createResourceLayout.forResources(
  'users',
  'documents',
);

const ResourcePage = createResourcePage.createComponent({
  props: {
    include: {
      title: true,
      actions: 'optional',
    },
  },
  users: {
    render: ({ resource }) => <span>{`Custom ${resource} content`}</span>,
  },
  documents: {
    render: ({ resource }) => <span>{`Custom ${resource} content`}</span>,
  },
  render: ({ actions, children, resource, title }, context) => {
    const CustomRender =
      resource === 'users' ? context.Users : context.Documents;

    return (
      <section>
        <h1>{title}</h1>
        {actions}
        {children}
        <CustomRender />
      </section>
    );
  },
});
```

`context.Users` and `context.Documents` are zero-prop components. Each custom
render receives the shared component props with `resource` narrowed to that
render's resource literal.

## Use the automatic resource prop

Like `children`, `resource` is always available in the main render without a
manual prop definition. At the call site, the concrete resource component
generic narrows the required resource value:

```tsx
const UsersPage = createResourcePage({
  resource: 'users',
  name: 'UsersPage',
  title: 'Users',
});

<ResourcePage<typeof UsersPage> resource='users' title='Users'>
  User content
</ResourcePage>;
```

Passing `resource='documents'` with `typeof UsersPage` is rejected by
TypeScript, as are custom render keys outside the selected resource scope.
