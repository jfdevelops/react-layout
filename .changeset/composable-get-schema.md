---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

Add `getSchema(path)` to factories created by `defineComposableComponent`. The path starts with a prop, `actions`, optionally followed by a path into a built-in definition: `actions.[string].href`. Only the next segment is suggested by the editor, and the returned definition is typed, with its value type as `typeof schema.infer`. A factory built with `defineContext` returns the definitions made from its default values.

Path checking follows recorded schema children and rejects paths into external schemas and custom validator functions.
