# @jfdevelops/react-layout-devtools-vite

## 0.1.1

### Patch Changes

- 3beec66: Respect lexical bindings when discovering layout APIs, avoid instrumenting unrelated composables callbacks, and preserve source locations for chained factory calls.

## 0.1.0

### Minor Changes

- 120a747: Exclude the React inspector from production bundles by default using empty components and dead-code elimination. Add an explicit /production entry and the Vite plugin's production option to keep the inspector enabled when desired. Development source instrumentation remains disabled during production builds.
- 5bc1c23: Add an opt-in Vite development plugin that supplies source locations and enables per-instance render-state previews. Show declaration and registration files with Open in editor actions in the inspector. Add typed defineLayoutPreview fixtures, Auto controls, forced-state indicators, recoverable preview errors, and cleanup when the last inspector disconnects. Production builds and server-side transforms are not instrumented.
