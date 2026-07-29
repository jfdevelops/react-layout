---
'@jfdevelops/react-layout': minor
---

Add `context.Root` to scoped components, move per-resource content under a
`resources` key, and infer every call site.

## Render the resource layout from inside the component

Each entry in `resources` carries that resource's create-time layout options
next to its `render`. The render context exposes `Root`, the layout for the
component's current `resource`, built from those options. The page shell and its
props live in one place instead of being repeated per route:

```tsx
const CalendarPage = createResourceLayout
  .forResources('appointments', 'availability')
  .createComponent({
    props: { include: { actions: true } },
    resources: {
      appointments: {
        segments: { title: 'Appointments' },
        render: () => <AppointmentsTable />,
      },
      availability: {
        segments: { title: 'Availability' },
        render: () => <AvailabilityTable />,
      },
    },
    render: ({ resource }, context) => (
      <context.Root actions={<ViewToggle />}>
        {resource === 'appointments' ? (
          <context.Appointments />
        ) : (
          <context.Availability />
        )}
      </context.Root>
    ),
  });
```

`context.Root` accepts the layout's custom props. The layout is created once per
resource and cached, so its identity is stable across rerenders and state inside
it survives.

An entry must supply the layout's required create-time props, exactly as
`createResourceLayout` does — they are how `Root` builds the layout, so omitting
one is a compile error rather than a validation failure when `Root` renders.

Each entry also accepts an optional `name` that overrides the layout name used by
`Root`. It falls back to the scope's configured default name, then to the
capitalized resource.

Rendering `context.Root` requires an entry for the component's current
`resource`; there are no layout options to build from otherwise, so it throws a
message naming the missing entry.

## The render context only contains defined resources

Previously the context was typed from every resource passed to `forResources`,
so a resource with no entry was still typed as a component and rendered `null`.
It is now typed from the keys written in `resources`:

```tsx
const Directory = createResourceLayout
  .forResources('users', 'admins')
  .createComponent({
    resources: {
      users: { render: () => <UsersTable /> },
    },
    render: (_props, context) => (
      <context.Root>
        <context.Users />
        {/* context.Admins is a type error — admins has no entry */}
      </context.Root>
    ),
  });
```

The component's `resource` prop still accepts every resource in the scope.

## Call sites are fully inferred

The scoped component's generic is now the `resource` prop itself, so explicit
type arguments are never needed:

```tsx
// Before
<Directory<typeof UsersPage> resource='users' title='Users' />

// After
<Directory resource='users' title='Users' />
```

### Breaking changes

- Per-resource entries move from the top level of the `createComponent` options
  to a `resources` key.
- `context` no longer exposes resources without an entry in `resources`. Add an
  entry for any resource whose context component you reference.
- Passing a concrete layout component as an explicit type argument
  (`<Directory<typeof UsersPage> …>`) is no longer supported. Remove the type
  argument; `resource` is inferred.
- A resource whose capitalized name is `Root` now throws, because that key is
  reserved by the render context.
- An entry listed under `resources` for a resource outside the scope now throws
  at create time.
- The capitalized-name collision check now only considers resources with an
  entry, so scopes containing colliding resources are fine as long as at most
  one of them defines a render.
