---
"@jfdevelops/react-layout": minor
---

Remove the deprecated `defineLazyDefaults.createErrorComponent` alias and the `CreateLazyErrorComponent` type. Use `defineLazyDefaults.createRenderState({ state: 'Error', render })`, which accepts the same render callback or code-keyed handlers.
