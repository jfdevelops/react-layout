---
'@jfdevelops/react-layout': minor
---

Add `defineResourceLayout.withLayout` for a once-mounted application shell.

`withLayout` returns everything `defineResourceLayout` does plus a `Shell`
component. Mount `Shell` once around your router `<Outlet />`: it renders the
`shell` block and stays mounted across resource navigation, so a persistent
sidebar, header, or breadcrumb container keeps its state and DOM while pages
mount and unmount inside it.

- `shell` mirrors the `layout` block (`props`, `composables`, `render`); its
  render context matches a per-resource `render`'s (`composables`, `resources`,
  `name`) plus `children` (the outlet), with `resource` / `resources.current`
  typed as possibly-`undefined`.
- Pages created by `createResourceLayout` report their resource to an ancestor
  `Shell` automatically, so resource-scoped shell composable names still resolve.
- `Shell` always accepts an optional `resource` prop that overrides the reported
  value — for tests, stories, or routes that render non-library content.
- Under `withLayout`, the per-resource `layout.render` is optional: omit it and
  the generated page renders its own `children` into the shell's outlet.
