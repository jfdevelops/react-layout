---
"@jfdevelops/react-layout": minor
---

`defineResourceLayout.withLayout` now accepts `name`, the default naming convention that `defineResourceLayout` already supported. The option was honored at runtime but missing from the types; created layouts now infer their names from it.
