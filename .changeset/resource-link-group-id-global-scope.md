---
"@jfdevelops/react-layout": patch
---

Fix: `createResourceLinks.withGroups()` no longer generates a random group id
(`crypto.randomUUID()` / `Math.random()`). Group ids are now derived from their
position in the array, so they stay stable across calls with the same input.

This matters because nav/config arrays are commonly defined as module-level
constants, and some runtimes (e.g. Cloudflare Workers) disallow generating
random values outside a request handler — calling `withGroups()` at module
scope on those runtimes threw `Disallowed operation called within global
scope`. It's now safe to call from anywhere.
