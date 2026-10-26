---
"@jfdevelops/react-layout-devtools-core": minor
"@jfdevelops/react-layout-devtools-react": minor
---

Move shared devtools configuration, palette defaults, preference validation, nested merging and serialization into devtools-core. Keep browser persistence and FAB coordinates in the React adapter, preserving the existing storage key and saved settings. Expose a separate transient session-state type and exclude selection, search and render-state overrides from serialized preferences.
