---
'@jfdevelops/react-layout': minor
---

Add `asHOF()` to scoped components for binding one resource up front.

`createComponent` returns a component whose `resource` is chosen at every call
site. `asHOF()` returns a factory that binds a resource once, so the resulting
component accepts every remaining prop and nothing else:

```tsx
const Directory = createResourceLayout
  .forResources('users', 'admins')
  .createComponent({
    props: { include: { title: true } },
    resources: {
      users: { title: 'Users', render: () => <UsersTable /> },
      admins: { title: 'Admins', render: () => <AdminsTable /> },
    },
    render: ({ resource }, context) => (
      <context.Root>
        {resource === 'users' ? <context.Users /> : <context.Admins />}
      </context.Root>
    ),
  });

const createDirectory = Directory.asHOF();
const UsersDirectory = createDirectory('users');

<UsersDirectory title='Users' />;
```

`resource` is removed from the bound component's props, and the bound resource is
available as a type-only `resource` property. Every other prop keeps its
optionality, so required included props stay required.

Each resource is bound once and cached: `createDirectory('users')` returns the
same component type on every call, including across separate `asHOF()` calls, so
rebinding during a render never remounts the subtree. Binding a resource outside
the scope throws.

The unbound component is unchanged and can still be used directly.
