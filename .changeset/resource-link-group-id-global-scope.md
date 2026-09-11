---
"@jfdevelops/react-layout": minor
---

`createResourceLinks.withGroups()` no longer generates a random group id
(`crypto.randomUUID()` / `Math.random()`). The id is now derived
deterministically from the group's `label` and its link resource keys (falling
back to its position only as a last resort), so it stays stable across calls
with the same input — and `withGroups()` is now safe to call from module scope.

This matters because nav/config arrays are commonly defined as module-level
constants, and some runtimes (e.g. Cloudflare Workers) disallow generating
random values outside a request handler — calling `withGroups()` at module
scope on those runtimes threw `Disallowed operation called within global
scope`.

Also adds an optional `id` on each group for callers who concatenate groups
from more than one `withGroups()` call (e.g. a module-owned nav section next
to a feature-owned one) and want to guarantee no collisions regardless of
shape.
