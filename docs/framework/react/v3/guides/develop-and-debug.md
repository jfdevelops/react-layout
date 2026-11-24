---
title: Develop and debug
description: Inspect the layout graph, preview render states, and keep inspection out of production bundles.
order: 110
---

React Layout can show you the graph of your resources, layouts, render states, composables and lazy declarations while you develop. Inspection is optional and read-only: it never validates props or runs render callbacks.

In this guide you will:

- show the inspector in development
- add source links and render-state previews with the Vite plugin
- keep inspection out of production
- embed the inspector in another tool

## Show the inspector

Install the React inspector as a development tool.

```npm
npm i @jfdevelops/react-layout-devtools-react@1.0.0
```

```pnpm
pnpm add @jfdevelops/react-layout-devtools-react@1.0.0
```

```yarn
yarn add @jfdevelops/react-layout-devtools-react@1.0.0
```

```bun
bun add @jfdevelops/react-layout-devtools-react@1.0.0
```

Keep the **full result** of your factory (or of a standalone `defineResourceLayout` call) and pass it as `source`. No provider is needed.

```tsx
import { ReactLayoutDevtools } from '@jfdevelops/react-layout-devtools-react';

const layouts = createDefinedResourceLayout({
  resources: ['users', 'settings'],
});

function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.DEV && <ReactLayoutDevtools source={layouts} />}
    </>
  );
}
```

`ReactLayoutDevtools` shows a floating button that opens an animated panel. Close it with the close button or Escape. Useful props:

| Prop            | Values                                                            |
| --------------- | ----------------------------------------------------------------- |
| `variant`       | `'toolbar'` docks a bar to the bottom instead of the floating button |
| `position`      | `bottom-right`, `bottom-left`, `top-right`, `top-left`            |
| `initialIsOpen` | Open on first render                                              |
| `config`        | Colors, `initialView` (`'graph'` or `'tree'`), filters, zoom, tree options |
| `storageKey`    | Isolate saved preferences when you mount several inspectors       |
| `nonce`         | A CSP style nonce for the current response                        |

Switch between **Graph** and **Tree** views. Green nodes are mounted now. Select a node to see its prop contracts, where each value is supplied, and its related nodes. Composables appear through the Composables toggle, and their edges show declared availability, not JSX containment.

> **Note:** A factory collects only definitions made through that factory. Lazy declarations appear before import and resolve after loading. Modules that were never imported cannot contribute private definitions. Arbitrary JSX nesting, state transitions, prop values and navigation history are not inferred.

## Add source links and state previews

The Vite plugin adds declaration locations, **Open in editor** actions, and temporary render-state previews. It is not required by the library or the inspector.

```npm
npm i -D @jfdevelops/react-layout-devtools-vite@1.0.0
```

```pnpm
pnpm add -D @jfdevelops/react-layout-devtools-vite@1.0.0
```

```yarn
yarn add -D @jfdevelops/react-layout-devtools-vite@1.0.0
```

```bun
bun add -D @jfdevelops/react-layout-devtools-vite@1.0.0
```

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactLayoutDevtools } from '@jfdevelops/react-layout-devtools-vite';

export default defineConfig({
  plugins: [react(), reactLayoutDevtools()],
});
```

It supports Vite 6, 7 and 8. To preview a state, select a mounted layout, pick an instance, then click a declared state name; **Auto** returns control to your app. Previews change the rendered component, not your data or routing, and clear when the instance unmounts. Supply typed fixture props with `defineLayoutPreview`:

```tsx
import { defineLayoutPreview } from '@jfdevelops/react-layout';

if (import.meta.env.DEV) {
  defineLayoutPreview(Page, {
    Empty: { message: 'No users found' },
  });
}
```

Each entry is checked against that state's props, and `default` supplies fixtures for the default state. Guard fixtures with `import.meta.env.DEV` so sample data is not shipped. Plugin options: `production`, `statePreview` (default `true`), `imports`, `include` and `exclude`.

## Keep it out of production

The default import renders nothing when `process.env.NODE_ENV` is `production`. Bundlers that replace that expression, including a normal Vite build, remove the inspector code. Other entry points:

| Entry                                                  | Behavior                                  |
| ------------------------------------------------------ | ----------------------------------------- |
| `@jfdevelops/react-layout-devtools-react`              | Disabled in production builds             |
| `@jfdevelops/react-layout-devtools-react/production`   | Always enabled                            |
| `@jfdevelops/react-layout-devtools-react/disabled`     | Always empty components                   |

With the Vite plugin, set `reactLayoutDevtools({ production: true })` to keep the inspector in a production build on purpose. Source-location instrumentation and state previews stay development-only.

## Embed the inspector

`ReactLayoutDevtoolsContent` renders only the inspector, with no button or portal. Use it on your own debug page or as a TanStack Devtools plugin:

```tsx
<TanStackDevtools
  plugins={[
    {
      name: 'React Layout',
      render: <ReactLayoutDevtoolsContent source={layouts} />,
    },
  ]}
/>
```

Use `layout="split"` or `"compact"` to control the arrangement. For a fully custom layout, compose `ReactLayoutDevtoolsProvider` with the Toolbar, Explorer, Inspector, Footer and Workspace pieces and read state from `useReactLayoutDevtools()`. All composed pieces must share one provider.

Preferences are saved to local storage under `react-layout-devtools:preferences:v1` (or your `storageKey`) and fall back to memory when storage is unavailable.

## Next steps

- [Render states](./render-states.md)
- [Lazy loading](./lazy-loading.md)
- [Troubleshooting](../troubleshooting.md#devtools)
