---
'@jfdevelops/react-layout': minor
---

Add type-safe resource layout factories for one or more resources.

## Create layouts for multiple resources

Use `createResourceLayout.forResources` to create a layout factory scoped to a subset of the configured resources:

```tsx
const createAccountLayout = createResourceLayout.forResources(
  'users',
  'admins',
);

const UsersPage = createAccountLayout({
  resource: 'users',
  name: 'UsersPage',
});
```

Configure a shared default-name callback when selecting resources:

```tsx
const createAccountLayout = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: (resource) => `${resource}Page`,
});

const UsersPage = createAccountLayout({ resource: 'users' });
// UsersPage.displayName is typed as 'UsersPage' | 'AdminsPage'
```

The `name` option can also map selected resources to individual strings or callbacks:

```tsx
const createAccountLayout = createResourceLayout.forResources({
  resources: ['users', 'admins'],
  name: {
    users: (resource) => `${resource.toLowerCase()}Directory`,
    admins: 'AdminsDirectory',
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
    name: 'AdminsPage',
  },
});
```

The returned factory has the same callable API as `createResourceLayout`, plus its scoped `forResource` and conditional `makeComposable` members. Resources outside the selection are rejected by TypeScript, and the nested name map only accepts selected resource keys.

## Expanded single-resource factories

`createResourceLayout.forResource` now supports matching resource, callback, name-map, and resource-keyed forms:

```tsx
const createUsersPage = createResourceLayout.forResource('users');

const createUsersDirectory = createResourceLayout.forResource({
  resource: 'users',
  name: (resource) => `${resource}Directory`,
});

const createMappedUsersDirectory = createResourceLayout.forResource({
  resource: 'users',
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
  resource: 'users',
  name: (resource) => `${resource}Directory`,
});

const UsersDirectory = createUsersDirectory();
```

When a layout still has required props, its builder continues to require an options argument.
