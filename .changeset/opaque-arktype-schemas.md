---
"@jfdevelops/react-layout-adapter-arktype": patch
---

Expose opaque Standard Schema interfaces for React nodes and elements instead of ArkType internal types to avoid excessive type instantiation in consumer mapped generics. Runtime schemas remain native ArkType schemas and node fields remain required by default.
