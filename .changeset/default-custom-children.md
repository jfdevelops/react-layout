---
"@jfdevelops/react-layout": major
---

Give every custom-prop surface optional ReactNode children by default, including reusable helpers and the schemas retained for component prop reuse. Explicit children schemas replace the default without losing their input/output types, validation, defaults, or transforms.

Merge scoped custom declarations before applying implicit defaults so unrelated resource declarations cannot overwrite an explicit children schema.
