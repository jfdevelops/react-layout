# @jfdevelops/react-layout

## 0.17.0

### Minor Changes

- 43a8435: Ship the `build-react-layouts` agent skill with architecture, factory, routing,
  and navigation best practices.

## 0.16.0

### Minor Changes

- b020b5b: Add `defineResourceLayout.forResources(...resources)` to bind resources before layout options (with optional extra `resources`), make `options` optional on `defineResourceLayout`, and add `createComponent.setProps` so shared include/custom props can be fixed once and merged into resource components / call sites.

### Patch Changes

- 7a2de5f: Allow scoped/createComponent render to return a component type; infer call-site props (including top-level createComponent) and compound statics from that return type.

## 0.15.1

### Patch Changes

- 29f757d: Fix scoped component reverse-mapping so declarations with `props` no longer
  infer `render` as `unknown`.

## 0.15.0

### Minor Changes

- e99cc0b: Add `components` to resource entries for registering components scoped to a
  single resource.

  Each entry under `resources` may declare `components`, keyed by component name.
  Every value is an object with an optional `props` and a `render`:

  ```tsx
  const Directory = createResourceLayout
    .forResources("users", "admins")
    .createComponent({
      props: { include: { title: true } },
      resources: {
        users: {
          title: "Users",
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
        admins: { title: "Admins", render: () => <AdminsTable /> },
      },
      render: ({ resource }, context) => (
        <context.Root>
          {resource === "users" ? <context.Users /> : <context.Admins />}
          <context.Users.Footer label="end" />
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

## 0.14.0

### Minor Changes

- fecbac3: Add `asHOF()` to scoped components for binding one resource up front.

  `createComponent` returns a component whose `resource` is chosen at every call
  site. `asHOF()` returns a factory that binds a resource once, so the resulting
  component accepts every remaining prop and nothing else:

  ```tsx
  const Directory = createResourceLayout
    .forResources("users", "admins")
    .createComponent({
      props: { include: { title: true } },
      resources: {
        users: { title: "Users", render: () => <UsersTable /> },
        admins: { title: "Admins", render: () => <AdminsTable /> },
      },
      render: ({ resource }, context) => (
        <context.Root>
          {resource === "users" ? <context.Users /> : <context.Admins />}
        </context.Root>
      ),
    });

  const createDirectory = Directory.asHOF();
  const UsersDirectory = createDirectory("users");

  <UsersDirectory title="Users" />;
  ```

  `resource` is removed from the bound component's props, and the bound resource is
  available as a type-only `resource` property. Every other prop keeps its
  optionality, so required included props stay required.

  Each resource is bound once and cached: `createDirectory('users')` returns the
  same component type on every call, including across separate `asHOF()` calls, so
  rebinding during a render never remounts the subtree. Binding a resource outside
  the scope throws.

  The unbound component is unchanged and can still be used directly.

## 0.13.0

### Minor Changes

- 4aafb58: Add `context.Root` to scoped components, move per-resource content under a
  `resources` key, and infer every call site.

  ## Render the resource layout from inside the component

  Each entry in `resources` carries that resource's create-time layout options
  next to its `render`. The render context exposes `Root`, the layout for the
  component's current `resource`, built from those options. The page shell and its
  props live in one place instead of being repeated per route:

  ```tsx
  const CalendarPage = createResourceLayout
    .forResources("appointments", "availability")
    .createComponent({
      props: { include: { actions: true } },
      resources: {
        appointments: {
          segments: { title: "Appointments" },
          render: () => <AppointmentsTable />,
        },
        availability: {
          segments: { title: "Availability" },
          render: () => <AvailabilityTable />,
        },
      },
      render: ({ resource }, context) => (
        <context.Root actions={<ViewToggle />}>
          {resource === "appointments" ? (
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
    .forResources("users", "admins")
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

## 0.12.1

### Patch Changes

- 3cf9755: Keep scoped resource render components stable across parent rerenders so their
  stateful descendants are preserved. Reject resource selections whose
  capitalized render-context keys collide instead of silently using the wrong
  resource render.

## 0.12.0

### Minor Changes

- 7cc669b: Add resource-specific renders and an automatic resource prop to scoped
  components.

  ## Define custom renders by resource

  Each resource selected by `forResources` can define its own render entry on the
  `createComponent` options. The main render callback receives those renders as
  capitalized components in its second argument:

  ```tsx
  const createResourcePage = createResourceLayout.forResources(
    "users",
    "documents"
  );

  const ResourcePage = createResourcePage.createComponent({
    props: {
      include: {
        title: true,
        actions: "optional",
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
        resource === "users" ? context.Users : context.Documents;

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
    resource: "users",
    name: "UsersPage",
    title: "Users",
  });

  <ResourcePage<typeof UsersPage> resource="users" title="Users">
    User content
  </ResourcePage>;
  ```

  Passing `resource='documents'` with `typeof UsersPage` is rejected by
  TypeScript, as are custom render keys outside the selected resource scope.

## 0.11.0

### Minor Changes

- 6662837: Add scoped resource components with resource-component generics and optional
  included props.

  ## Create one component for multiple resource layouts

  `forResources` factories now expose `createComponent`. Props selected with
  `include` become props on the shared component, including custom props already
  defined for the resource layout:

  ```tsx
  const createDirectoryLayout = createResourceLayout.forResources(
    "users",
    "admins"
  );

  const Directory = createDirectoryLayout.createComponent({
    props: {
      include: {
        title: true,
        actions: "optional",
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
    resource: "users",
    name: "UsersPage",
    title: "Users",
  });

  <Directory<typeof UsersPage> title="Users">User content</Directory>;
  ```

  For example, a component created for `posts` is rejected when `Directory` was
  scoped to only `users` and `admins`.

  The scoped factory also exposes a type-only `resources` property for extracting
  the selected resource union. Its runtime value is `undefined`:

  ```tsx
  type DirectoryResource = typeof createDirectoryLayout.resources;
  // 'users' | 'admins'
  ```

## 0.10.0

### Minor Changes

- 1757999: Add type-safe resource layout factories for one or more resources.

  ## Create layouts for multiple resources

  Use `createResourceLayout.forResources` to create a layout factory scoped to a subset of the configured resources:

  ```tsx
  const createAccountLayout = createResourceLayout.forResources(
    "users",
    "admins"
  );

  const UsersPage = createAccountLayout({
    resource: "users",
    name: "UsersPage",
  });
  ```

  Configure a shared default-name callback when selecting resources:

  ```tsx
  const createAccountLayout = createResourceLayout.forResources({
    resources: ["users", "admins"],
    name: (resource) => `${resource}Page`,
  });

  const UsersPage = createAccountLayout({ resource: "users" });
  // UsersPage.displayName is typed as 'UsersPage' | 'AdminsPage'
  ```

  The `name` option can also map selected resources to individual strings or callbacks:

  ```tsx
  const createAccountLayout = createResourceLayout.forResources({
    resources: ["users", "admins"],
    name: {
      users: (resource) => `${resource.toLowerCase()}Directory`,
      admins: "AdminsDirectory",
    },
  });
  ```

  Resource-keyed configuration is supported as well:

  ```tsx
  const createAccountLayout = createResourceLayout.forResources({
    users: {
      name: (resource) => `${resource}Page`,
    },
    admins: {
      name: "AdminsPage",
    },
  });
  ```

  The returned factory has the same callable API as `createResourceLayout`, plus its scoped `forResource` and conditional `makeComposable` members. Resources outside the selection are rejected by TypeScript, and the nested name map only accepts selected resource keys.

  ## Expanded single-resource factories

  `createResourceLayout.forResource` now supports matching resource, callback, name-map, and resource-keyed forms:

  ```tsx
  const createUsersPage = createResourceLayout.forResource("users");

  const createUsersDirectory = createResourceLayout.forResource({
    resource: "users",
    name: (resource) => `${resource}Directory`,
  });

  const createMappedUsersDirectory = createResourceLayout.forResource({
    resource: "users",
    name: {
      users: (resource) => `${resource.toLowerCase()}Directory`,
    },
  });

  const createKeyedUsersDirectory = createResourceLayout.forResource({
    users: {
      name: (resource) => `${resource}Directory`,
    },
  });
  ```

  Name callbacks receive the capitalized resource literal, while `toLowerCase()` retains the lowercase resource literal. Callback return values are also preserved as literal display-name types without requiring `as const`.

  ## Optional builder options

  Resource builders can now be called without an empty object when no required props remain:

  ```tsx
  const createUsersDirectory = createResourceLayout.forResource({
    resource: "users",
    name: (resource) => `${resource}Directory`,
  });

  const UsersDirectory = createUsersDirectory();
  ```

  When a layout still has required props, its builder continues to require an options argument.

## 0.9.0

### Minor Changes

- d8b66a7: Allow `createResourceLinks` and `createResourceLinks.withGroups` to use arbitrary property names while preserving each key's literal type in `href` and `hash` callbacks.

## 0.8.2

### Patch Changes

- d886b27: Rename `createResourceLinks.withGroup` to `withGroups`, add a generated `id` to each returned group, and improve grouped link autocomplete when mapping over results.

## 0.8.1

### Patch Changes

- 7e136fc: Make `createResourceLinks.withGroup` group `label` optional and default to `null`. Preserve `resource` and `icon` on hashed grouped link types.

## 0.8.0

### Minor Changes

- a7cbc20: Add `createResourceLinks.withGroup` for building grouped navigation links with full IDE autocomplete support.

## 0.7.0

### Minor Changes

- fe26a4f: Update `createResourceLinks` to include `resource` on each returned link and support an optional `icon` in link config.

## 0.6.0

### Minor Changes

- 4a7450b: Update `createResourceLinks` to return structured href metadata with separate `given`, `full`, and optional `hash` values. Resource link config now supports independent `href` and `hash` options, including resource-aware functions, and the implementation has been extracted into its own module.

## 0.5.2

### Patch Changes

- Disable tsdown auto-generated exports so `package.json` types conditions are preserved when publishing.
- Updated dependencies
  - @jfdevelops/react-layout-composables@0.2.3
  - @jfdevelops/react-layout-validator@0.2.3

## 0.5.1

### Patch Changes

- Restore `types` export condition and `.d.mts` types entry for correct TypeScript resolution under `moduleResolution: "bundler"`.
- Updated dependencies
  - @jfdevelops/react-layout-composables@0.2.2
  - @jfdevelops/react-layout-validator@0.2.2

## 0.5.0

### Minor Changes

- fd041b3: Add `createResourceLinks` to `defineResourceLayout` for building navigation links from resource config. Links are normalized with a `/#` prefix, and anchor links support custom `href` values as strings or resource-aware functions.
- 6b8c043: Add top-level `createResourceLayout.makeComposable` for creating a `ComposableResourceLayout` directly with `CreateResourceLayoutMakeComposableOptions` (required `name` and `resource`, optional layout props). Matches `createResourceLayout(...).makeComposable()` and is only available when the layout defines composables.

## 0.4.1

### Patch Changes

- 6b29ea9: Add `types` condition to package exports for correct TypeScript resolution under `moduleResolution: "bundler"`. Also corrects the top-level `types` field to point to `.d.mts` instead of `.d.cts`.
- Updated dependencies [6b29ea9]
  - @jfdevelops/react-layout-composables@0.2.1
  - @jfdevelops/react-layout-validator@0.2.1

## 0.4.0

### Minor Changes

- 6dfc052: Split validators, composables, and breadcrumb preset into dedicated packages.
- 3d7f627: add ability to define reusable composables

### Patch Changes

- Updated dependencies [6dfc052]
  - @jfdevelops/react-layout-validator@0.2.0
  - @jfdevelops/react-layout-composables@0.2.0

## 0.3.0

### Minor Changes

- 1db7504: Adds `forResource` factory function to aid in the creation of layout for a single resource
- f4ed819: - adds `setDefaults` to layout factories created with `forResource`
  - default layout option values are set in a single call
  - non-JSX props accept plain values, with optional `Updater` overrides when creating a layout
  - `JSX.Element` props accept render functions that receive their defined element props
  - fixes included `JSX.Element` props to surface as render functions in `LayoutRenderProps`

### Patch Changes

- 73a782d: - adds the `forResource` helper to `getComponent` for creating reusable resource scoped `getComponent` helpers
  - the config is now returned from `createResourceConfig`
- fbdaaa0: adds createResourceConfig function for dynamic resource retrieval

## 0.2.0

### Minor Changes

- 9550541: Add `capitalize` utility for naming composable components

## 0.1.1

### Patch Changes

- 66f66eb: Switch library builds to `tsdown` and add Changesets-based release management for the package.
