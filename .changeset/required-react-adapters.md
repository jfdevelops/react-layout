---
"@jfdevelops/react-layout-adapters": patch
"@jfdevelops/react-layout-adapter-zod": patch
"@jfdevelops/react-layout-adapter-valibot": patch
"@jfdevelops/react-layout-adapter-arktype": patch
---

Require React node fields by default across adapters. Reject top-level undefined and infer required node fields; callers can explicitly opt into optional schemas. Nested undefined children and null nodes remain valid.
