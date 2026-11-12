---
"@jfdevelops/react-layout": patch
"@jfdevelops/react-layout-validator": patch
"@jfdevelops/react-layout-composables": patch
---

Remove `arktype` from runtime dependencies. Error contexts now use a dependency-free Standard Schema, so consumer bundles no longer include ArkType (about 69 KB gzipped) unless they use `@jfdevelops/react-layout-adapter-arktype`.
