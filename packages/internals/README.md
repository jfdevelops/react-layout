# @jfdevelops/react-layout-internals

Types and helpers shared by the React Layout packages, such as `Show`,
`ShowCallable`, `UnionToIntersection`, `BaseComponent`, and `capitalize`.

This package exists so those definitions live in one place. It is an
implementation detail of the `@jfdevelops/react-layout*` packages: import the
public types from `@jfdevelops/react-layout` or
`@jfdevelops/react-layout-composables` instead, and do not depend on this
package directly. Its exports can change in any release.
