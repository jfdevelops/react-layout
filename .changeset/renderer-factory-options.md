---
'@jfdevelops/react-layout': major
---

Replace positional renderer factory arguments with one options object containing independent `component`, `params`, and `props` fields:

```tsx
const renderUsers = renderPage('users');
const Page = renderUsers({
  component: 'component',
  params: { count: '1' },
  props: { label: 'Users' },
});
```

Migrate `factory(componentKey, props)` to `factory({ component: componentKey, props })`. For parameter objects, move `componentKey` into `component` and place the remaining path/custom parameters under `params`. `component` accepts only a configured component key or `'*'`.

Using `component: '*'` returns the factory result for every configured component slot, keyed by its component key. Path/custom parameters and factory props apply to each result. Fields are optional when their declared inputs are optional or defaulted; the options object can be omitted when every field is optional.
