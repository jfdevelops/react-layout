# @jfdevelops/react-layout-internals

Types and helpers shared by the React Layout packages, such as `Show`,
`ShowCallable`, `UnionToIntersection`, `BaseComponent`, and `capitalize`.
`StringSelection`, `StringSelectionResult`, and `resolveStringSelection` share
the typed single-key / wildcard contract while callers choose the wildcard result.

This package exists so those definitions live in one place. It is an
implementation detail of the `@jfdevelops/react-layout*` packages: import the
public types from `@jfdevelops/react-layout` or
`@jfdevelops/react-layout-composables` instead, and do not depend on this
package directly. Its exports can change in any release.

It is private and versioned with Changesets, including release tags. Add a
changeset for internal changes just as for public packages. Its version is also
required by pnpm when packing dependents with `workspace:*` references.
It is never published; public packages bundle the internal definitions they use.
