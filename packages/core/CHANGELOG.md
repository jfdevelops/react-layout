# @jfdevelops/react-layout

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
