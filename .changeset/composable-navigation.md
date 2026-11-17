---
'@jfdevelops/react-layout-composable-navigation': minor
'@jfdevelops/react-layout-composable-breadcrumb': minor
---

The default `segments` definition of `createBreadcrumbComposable` is now a validator function, so its `~standard.vendor` is `react-layout` instead of `arktype`.

Add `@jfdevelops/react-layout-composable-navigation` with the `Breadcrumb` and `Tabs` presets and the navigation contract they are built from, exported from `/contract`. Navigation items accept `href` and `isDisabled`.

`@jfdevelops/react-layout-composable-breadcrumb` now re-exports `createBreadcrumbComposable` from the navigation package, so breadcrumb segments accept `href` and `isDisabled` too.
