---
'@jfdevelops/react-layout': patch
---

Fix `include` entries declared as `{ passthrough: 'component', visibility: 'optional' }` so they again accept create-time defaults on `createResourceLayout` / `forResources` factories, matching the shorthand `'optional'` behavior. The call site still overrides the create-time value. Required component passthrough is unchanged and remains absent from the factory options.
