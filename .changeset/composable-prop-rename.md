---
'@jfdevelops/react-layout-composables': minor
'@jfdevelops/react-layout': minor
---

Add `rename` and `extend` to factories created by `defineComposableComponent`. `rename` gives a default prop a new name (`{ items: 'tabs' }`) or a new name and definition (`{ title: { name: 'heading', schema } }`). `extend` derives a new factory with its own name, props, or wrapper. An invalid rename throws `InvalidPropRenameError`.

Preset composables in one layout that declare the same prop must now share one definition. Two different definitions for one prop throw `ConflictingPresetPropError` when the layout is created; previously the last definition silently won.

The composables package now validates its error contexts with the built-in validators and no longer depends on arktype.
