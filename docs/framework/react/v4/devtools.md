---
title: Devtools
description: Inspect resources, layouts, states, and composables during development.
order: 50
---

Devtools show the layout graph and mounted instances. Use the React inspector
on its own, then add the Vite plugin for source links and render-state previews.
No provider is required.

## Choose a package

| Package | Purpose |
| --- | --- |
| `@jfdevelops/react-layout-devtools-react` | Floating inspector and embeddable `ReactLayoutDevtoolsContent`; React and React DOM 18 or newer. |
| `@jfdevelops/react-layout-devtools-vite` | Source locations, editor links, and state previews for Vite 6, 7, and 8. |
| `@jfdevelops/react-layout-devtools-core` | Framework-independent inspection protocol and graph types for custom tooling; no React or DOM dependency. |

Install the React inspector for your app and the optional plugin as a development
dependency. Core inspection infrastructure is already installed by the library.

```bash
pnpm add @jfdevelops/react-layout-devtools-react
pnpm add -D @jfdevelops/react-layout-devtools-vite
```

## Mount the inspector

Keep the full factory result and pass it as `source`. In this Vite example,
replace the placeholder content with your application's routes:

```tsx
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';
import { ReactLayoutDevtools } from '@jfdevelops/react-layout-devtools-react';

const layouts = createDefinedResourceLayout({
  resources: ['services', 'appointments'],
});

export function App() {

  return (
    <>
      <main>Your application</main>
      {import.meta.env.DEV && <ReactLayoutDevtools source={layouts} />}
    </>
  );
}
```

Create your definitions through that same factory so the inspector can discover
them. A standalone `defineResourceLayout` result can also be used as the source.
Switch between graph and tree views to inspect resources, prop contracts,
composables, and lazy loading status.

## Add Vite integration

```ts
import react from '@vitejs/plugin-react';
import { reactLayoutDevtools } from '@jfdevelops/react-layout-devtools-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), reactLayoutDevtools()],
});
```

Select a mounted layout and a state in the inspector to preview it; choose
**Auto** to return control to the app. Use `defineLayoutPreview` from the main
library when a state needs fixture props.

The default React entry is disabled in production builds. The `/production`
entry always enables the inspector; `/disabled` always renders empty components.
Keep fixture props behind a development guard. See
[Develop and debug](./guides/develop-and-debug.md) for configuration, embedding,
and production behavior.
