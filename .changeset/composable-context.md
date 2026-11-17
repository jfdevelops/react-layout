---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

Add `defineComposableComponent.defineContext({ ... }).handler(...)` for composables whose definition depends on values a caller may change. Each context entry has a default `value` and an optional `handler` that decides how a supplied value is applied. `handler` on the builder receives the values and returns the definition. A caller passes a value, or a function of the default, beside the other options: `createNotice({ tones: (defaults) => [...defaults, 'loud'], render })`.
