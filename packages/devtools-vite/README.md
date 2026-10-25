# React Layout Devtools — Vite

Optional development instrumentation for React Layout Devtools. The plugin adds
source locations and enables temporary render-state previews. It is not required
by the library or by the React inspector.

```sh
pnpm add -D @jfdevelops/react-layout-devtools-vite
```

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactLayoutDevtools } from '@jfdevelops/react-layout-devtools-vite';

export default defineConfig({
  plugins: [react(), reactLayoutDevtools()],
});
```

Continue passing your definition or factory to `<ReactLayoutDevtools source={...} />`
or `<ReactLayoutDevtoolsContent source={...} />`. No provider or changes to existing
layout calls are needed.

## Source locations

The selected-node panel shows declaration and registration locations when they
differ. **Open in editor** uses Vite's development editor endpoint and its editor
configuration (`LAUNCH_EDITOR` when needed). Paths displayed in the panel are
relative to the Vite root. Editor requests stay on the development server origin.

The transform recognizes named imports (including aliases), namespace imports,
factory helpers, `forResources`/`forResource` bindings, and inline render states.
Metadata travels with imported state definitions, including spread fragments.
Composable definitions created through the library's helpers carry their own
locations. Arbitrary third-party components and dynamically computed API calls
may not have a discoverable declaration location; the plugin does not guess it.

## Render-state previews

Select a mounted layout or one of its states. Choose a mounted instance, then
click a declared render-state name. **Auto** restores application-controlled
rendering. The panel indicates forced states and reports missing preview props.
Overrides are temporary, are never saved to localStorage, and clear when the
instance unmounts or the last connected inspector closes.

Previewing changes the rendered component, not application data, routing, or the
conditions that normally select that state. Components still run their normal
React lifecycle and effects. Unmounted layouts cannot be forced.

Use `defineLayoutPreview` from the main library for typed, partial state props:

```tsx
import { defineLayoutPreview } from '@jfdevelops/react-layout';

const Page = definition.createResourceLayout({ name: 'UsersPage', resource: 'users' });

if (import.meta.env.DEV) {
  defineLayoutPreview(Page, {
    Empty: { message: 'No users found' },
    // Each entry is checked against that render state's component props.
  });
}
```

Compatible current props are reused; fixtures override them for the selected
state. `default` supplies fixtures for the default render state. Namespace layouts
(`{ Root, Loading, ... }`) are supported too. Guard fixtures with
`import.meta.env.DEV` to avoid shipping sample data in production bundles.

## Options

```ts
reactLayoutDevtools({
  statePreview: false, // source locations only; defaults to true
  imports: ['my-layout-wrapper'], // extra packages that re-export the layout API
  include: /\/src\//,
  exclude: /\.test\.[jt]sx?$/,
});
```

Relative imports and `@/` aliases are recognized automatically. For other aliases,
add the import specifier to `imports`. The plugin runs before React transforms,
returns source maps, skips dependencies and SSR transforms, and is disabled in
production builds. It uses Vite's development transform and editor integration;
other bundler adapters can provide the same optional devtools-core metadata and
preview capabilities.
