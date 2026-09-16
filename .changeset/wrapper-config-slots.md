---
"@jfdevelops/react-layout": minor
---

Add an optional `wrapper` to resource config entries (including `new`/`detail`
branches) so a shared wrapper doesn't have to be repeated around every
component slot.

```tsx
createResourceConfig({
  general: {
    wrapper: <GeneralSettingsPage />,
    component: <GeneralSettingsForm />,
    pendingComponent: <SettingsSectionLoading />,
    errorComponent: <SettingsSectionError resource='general' />,
  },
});
```

`wrapper` accepts either a single React element, applied to every configured
slot on the entry, or `{ applyTo, component }` to scope it to specific slots:

```tsx
createResourceConfig({
  general: {
    wrapper: { applyTo: ['component'], component: <GeneralSettingsPage /> },
    component: <GeneralSettingsForm />,
    errorComponent: <SettingsSectionError resource='general' />, // not wrapped
  },
});
```

Wrapping is applied wherever a component is resolved (`getComponent`,
`getComponent.forResource`, and deep config-path lookups). `wrapper` is now a
reserved config key, alongside `component` / `errorComponent` / `new` /
`detail`, and cannot be used as a sub-resource slug.
