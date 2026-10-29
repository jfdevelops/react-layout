---
"@jfdevelops/react-layout": patch
---

Render lazy members synchronously once their shared module has loaded, avoiding a second loading fallback when a route swaps Loading for its page. Cache member mappings without remounting loaded children, and clear the module and member caches on retry.
