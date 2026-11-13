---
"@jfdevelops/react-layout": major
---

Give React component custom props optional ReactNode children by default, including the schemas retained for component prop reuse. Reusable helpers and option schemas receive no implicit children. Explicit component children schemas replace the default without losing their input/output types, validation, defaults, or transforms.

Merge scoped custom declarations before applying implicit defaults so unrelated resource declarations cannot overwrite an explicit children schema.
