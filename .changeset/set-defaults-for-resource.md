---
"@jfdevelops/react-layout": minor
---

- adds `setDefaults` to layout factories created with `forResource`
- default layout option values are set in a single call
- non-JSX props accept plain values, with optional `Updater` overrides when creating a layout
- `JSX.Element` props accept render functions that receive their defined element props
- fixes included `JSX.Element` props to surface as render functions in `LayoutRenderProps`
