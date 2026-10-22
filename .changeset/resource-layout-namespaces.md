---
'@jfdevelops/react-layout': minor
---

Add optional `namespace` defaults to resource-layout definitions and shared factories. `namespace: true` returns a plain object containing `Root` and the named states, avoiding native function members in namespace autocomplete. Defaults inherit through resource factories and can be overridden per definition or component creation; the default remains false.
