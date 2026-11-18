---
title: Migrating from v3 to v4
description: The two breaking renderer changes in 4.0.0, with before and after code, plus what stays the same.
order: 140
---

v4 changes the shared renderer API in two places. Nothing else in the public API
is breaking. If you do not use `createRenderer` or the `displayName` callback of a
renderer, upgrading needs no code changes.

In this guide you will:

- move renderer factory calls to the options object
- read `path.value` in `displayName` callbacks
- adopt the new `forResource` and path helpers

Coming from v2 or v1? Migrate one major at a time: [v2 to v3](../v3/migration.md),
[v1 to v2](../v2/migration.md), [v0 to v1](../v1/migration.md).

## Upgrade the package

```sh
pnpm add @jfdevelops/react-layout@4
```

The companion packages released alongside v4 are patch releases of their v3-era
versions (for example `composable-navigation` 0.1.1 to 0.1.2). The full set is in the
[compatibility table](./getting-started.md#companion-package-versions).

## 1. Factories take one options object

**Before (v3)**

```tsx
const renderTrash = renderPage('trash');

renderTrash('component');
renderTrash({ componentKey: 'component', title: 'Trash' }, { label: 'Page' });
```

**After (v4)**

```tsx
renderTrash({ component: 'component' });
renderTrash({
  component: 'component',
  params: { title: 'Trash' },
  props: { label: 'Page' },
});
```

| v3                                          | v4                                                |
| ------------------------------------------- | ------------------------------------------------- |
| `factory(componentKey, props)`              | `factory({ component: componentKey, props })`     |
| `factory({ componentKey, ...params }, props)` | `factory({ component, params, props })`          |
| `componentKey` inside the parameter object  | `component`, never inside `params`                |

Details:

- `component` accepts only a configured component key or `'*'`.
- `component: '*'` returns the factory result for every configured component slot,
  keyed by component key. Path parameters and factory props apply to each result.
- A field is optional when its declared inputs are optional or defaulted. When every
  field is optional, the whole options object can be omitted.
- Required `factory.props` inputs make the `props` field required.

## 2. `displayName` receives a path object

**Before (v3)**

```tsx
displayName: ({ path, params }) => `${path.toUpperCase()}${params.componentKey}`,
```

**After (v4)**

```tsx
displayName: ({ path, params }) => `${path.value.toUpperCase()}${params.componentKey}`,
```

Replace direct string operations on `path` with `path.value`. Template interpolation
and `path.toString()` still produce the original string, and the `render` callback
still receives its string `path`.

## 3. New helpers you can adopt

These are additive.

- `path.is(prefix)` matches the exact path and its dot-separated descendants and
  narrows `path.value`.
- `path.capitalize()` capitalizes the current path. A valid path argument
  capitalizes that literal, and `'*'` returns the current path capitalized with its
  type widened to the union of capitalized valid paths. The top-level `capitalize`
  helper is also exposed on the callback.
- Selections with configured descendants expose `forResource(relativePath)`, so
  `renderPage('users').forResource('detail')` equals `renderPage('users.detail')`.
  Leaf selections omit it. A Component returned by a factory stays component-only and
  does not run the factory again.
- Path arguments complete one segment at a time in `getComponent`,
  `createGetComponent`, `getComponentForPath`, `forPaths` and `isSubResourceKey`,
  and the complete supplied path is still validated.
- `CapitalizeFn` is a shared interface for capitalization callbacks.

## What did not change

- Every other export and factory member listed in the [API reference](./reference/api.md).
- Standard Schema props, adapters, composables, lazy loading and hosted surfaces.
- Companion package APIs.

## Checklist

1. Search for calls to renderer factories and rewrite each to the options object.
2. Search `displayName` callbacks for string methods on `path`.
3. Run your type check. Both changes are caught by the compiler.

## Next steps

- [Route components and renderers](./guides/route-components.md)
- [Troubleshooting](./troubleshooting.md#render-states-and-renderers)
