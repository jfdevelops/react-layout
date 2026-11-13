---
"@jfdevelops/react-layout": patch
---

Render created layouts with less work. Include behavior is resolved once per created component instead of on every render, included props are resolved in a single pass, and state composables share one definitions object when the options are not a single object schema. In the new client-render benchmark (`pnpm --filter @jfdevelops/react-layout bench`) mounting and re-rendering a layout are each about 8% faster.
