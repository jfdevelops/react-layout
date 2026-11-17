---
'@jfdevelops/react-layout': major
---

The `displayName` callback now receives a typed path object. Replace direct string operations on `path` with `path.value`. Template interpolation and `path.toString()` still produce the original path string; the `render` callback continues receiving its string path.

`path.is(prefix)` matches the exact path and dot-separated descendants, narrowing `path.value`. `path.capitalize()` capitalizes the current path; passing a valid path capitalizes that literal. Passing `'*'` returns the current path capitalized, with its string type widened to the union of all capitalized valid paths. The callback also exposes the existing top-level `capitalize` helper. Path arguments complete one segment at a time.

Selections with configured descendants expose `forResource(relativePath)`, preserving their renderer, factory, and scoped overrides. For example, `renderPage('users').forResource('detail')` selects the same renderer as `renderPage('users.detail')`. Leaf selections omit `forResource` from both their type and runtime object.

Descendant selection on a Component returned by a factory remains component-only and does not run that factory again.
