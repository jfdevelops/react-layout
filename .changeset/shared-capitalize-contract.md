---
'@jfdevelops/react-layout': patch
'@jfdevelops/react-layout-composables': patch
---

Use a shared `CapitalizeFn` interface for capitalization callbacks. It preserves literal return types and centralizes the overload contract used by layout naming and renderer paths.

Shared selection helpers remain bundled implementation details. The private internals package is unversioned and is not published or tagged.
