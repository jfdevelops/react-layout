---
'@jfdevelops/react-layout': minor
---

Add `components` to resource entries for registering components scoped to a
single resource.

Each entry under `resources` may declare `components`, keyed by component name.
Every value is an object with an optional `props` and a `render`:

```tsx
const Directory = createResourceLayout
  .forResources('users', 'admins')
  .createComponent({
    props: { include: { title: true } },
    resources: {
      users: {
        title: 'Users',
        components: {
          Toolbar: {
            render: ({ title }) => <nav>{title}</nav>,
          },
          Footer: {
            props: { label: createProp.string() },
            render: ({ label }) => <footer>{String(label)}</footer>,
          },
        },
        render: ({ resource }, components) => (
          <>
            <components.Toolbar />
            <span>{resource}</span>
          </>
        ),
      },
      admins: { title: 'Admins', render: () => <AdminsTable /> },
    },
    render: ({ resource }, context) => (
      <context.Root>
        {resource === 'users' ? <context.Users /> : <context.Admins />}
        <context.Users.Footer label='end' />
      </context.Root>
    ),
  });
```

A scoped component is available in three places:

- as the second argument to its own resource's `render` (keyed by name, with
  call-site prop types)
- on the main render context under its resource — `context.Users.Toolbar`
- as a static on the component returned by `asHOF()` —
  `Directory.asHOF()('users').Toolbar`

Its `render` receives the scoped component's props with `resource` narrowed to
that resource, plus the other components registered for it (excluding itself).
Components are created once per resource and cached, so their identity is
stable across renders.

Names are tracked per resource: `context.Admins.Toolbar` is a type error when
`admins` registered no components. Declared `props` are validated at render and
typed at the call site, so `context.Users.Footer` requires `label`, while a
component with no declared props is callable with no arguments. They are also
typed on the props argument inside that component's own `render`.

A scoped component cannot use a name that collides with the component object's
own statics (`props`, `resource`, `displayName`) or with `Function.prototype`
members (`name`, `length`, `call`, …); doing so throws at create time.
