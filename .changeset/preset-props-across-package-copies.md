---
"@jfdevelops/react-layout-composables": patch
"@jfdevelops/react-layout": patch
"@jfdevelops/react-layout-validator": patch
---

Restore breadcrumb segments inference and props.include suggestions when presets come from a separately installed composables version. Recognize preset metadata across distinct declaration symbols for the shared runtime key.

Accept the public base-prop shape across validator versions without requiring the same protected class identity.

Preserve shared include inference when a packaged breadcrumb is spread alongside locally created composables.
