# Library vision & purpose
The purpose of this library, layout-creator, is to have an easy way for creating pages that share the same layout and data types. A good example of this is an admin dashboard. Admin dashboards typically all have the same layout: a header, sidebar, and page content.

<!-- TODO finish this -->
## Why not use a component that takes props?
You may have this question and while it's definitely valid and still doable, there is still a lot of duplicated code that you will have to use in all pages. Let's go back to our admin dashboard for example. Your admin dashboard is growing and now requires

## Initialization
Start by calling `defineLayout`.
```ts
export const layoutCreator = defineLayout({
  resources: ['users', 'settings', '', /* ...more resources here */],
  inProps: {

  }
});
```