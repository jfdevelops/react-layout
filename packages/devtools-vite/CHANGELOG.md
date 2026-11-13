# @jfdevelops/react-layout-devtools-vite

## 1.0.0

### Major Changes

- 65da0eb: Release every React Layout package as part of the coordinated major release for the Standard Schema prop system and updated public types.

### Patch Changes

- 27941fc: Keep property documentation on its property in published declarations. The declaration bundler moved every single-line `/** … */` member comment onto the line of the member before it, so editors showed no docs (or the wrong docs) on hover. Member comments are now written in block form, which the bundler preserves.

## 0.1.2

### Patch Changes

- d0b426a: Bind JavaScript modules during source analysis so workspace .mjs dependencies do not crash the development server and JavaScript layout APIs receive annotations.

## 0.1.1

### Patch Changes

- 3beec66: Respect lexical bindings when discovering layout APIs, avoid instrumenting unrelated composables callbacks, and preserve source locations for chained factory calls.

## 0.1.0

### Minor Changes

- 120a747: Exclude the React inspector from production bundles by default using empty components and dead-code elimination. Add an explicit /production entry and the Vite plugin's production option to keep the inspector enabled when desired. Development source instrumentation remains disabled during production builds.
- 5bc1c23: Add an opt-in Vite development plugin that supplies source locations and enables per-instance render-state previews. Show declaration and registration files with Open in editor actions in the inspector. Add typed defineLayoutPreview fixtures, Auto controls, forced-state indicators, recoverable preview errors, and cleanup when the last inspector disconnects. Production builds and server-side transforms are not instrumented.
