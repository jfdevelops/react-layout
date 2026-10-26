# React Layout Devtools

Optional, provider-free devtools for `@jfdevelops/react-layout`.

```sh
pnpm add @jfdevelops/react-layout-devtools-react
```

Keep the full result of your factory (or of a standalone `defineResourceLayout` call) and pass it as `source`:

```tsx
import { ReactLayoutDevtools } from '@jfdevelops/react-layout-devtools-react';

const layouts = createDefinedResourceLayout({ resources: ['users', 'settings'] });
export const { defineResourceLayout, createRenderState } = layouts;

function App() {
  return <>
    <YourApp />
    {import.meta.env.DEV && <ReactLayoutDevtools source={layouts} />}
  </>;
}
```

`ReactLayoutDevtools` displays a floating action button. Opening it animates the panel into view and hides the button. Close the panel with its close button or Escape; the button reappears and regains focus. Reduced motion preferences are respected. Optional `initialIsOpen` and `position` (`bottom-right`, `bottom-left`, `top-right`, `top-left`) configure its presentation.

`ReactLayoutDevtoolsContent` renders only the inspector, with no floating button or portal. Use it in your own debug page or as a TanStack Devtools plugin:

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactLayoutDevtoolsContent } from '@jfdevelops/react-layout-devtools-react';

<TanStackDevtools plugins={[{
  name: 'React Layout',
  render: <ReactLayoutDevtoolsContent source={layouts} />,
}]} />
```

This follows [TanStack's custom plugin contract](https://tanstack.com/devtools/latest/docs/framework/react/guides/custom-plugins). TanStack is not a dependency of this adapter. Both components accept `source`, `className`, and `style`.

Switch between Graph and Tree views in either component. Tree branches support individual toggles, Expand all / Collapse all, keyboard navigation, and live activity. Explicit references appear as leaf links to avoid cycles.

The graph shows resources, definitions, created layouts, render states, and explicit state references. Select a node to inspect its prop contracts and related nodes. Search and the active filter retain ancestors to preserve context. Composables are available through the Composables toggle; these edges indicate declared availability, not actual JSX containment. Scroll to pan and use the zoom controls to inspect larger graphs.

Green nodes are currently mounted, including multiple simultaneous instances. The inspector can be opened after components have mounted. A factory collects definitions made through that factory. Lazy declarations appear before import and resolve after loading. Modules which have never been imported cannot contribute their private definitions. Arbitrary JSX nesting, state transitions, prop values, and navigation history are not inferred.

See [devtools-core](../devtools-core/README.md) for the framework-independent inspection protocol.

## Configuration

Both components accept the same optional, typed `config`. Import `ReactLayoutDevtoolsConfig` when sharing a configuration between callers.

```tsx
<ReactLayoutDevtools source={layouts} config={{
  chipColors: {
    resource: '#22d3ee',
    state: { color: '#c4b5fd', background: '#2e1065' },
    active: { color: 'var(--success)', background: 'var(--success-muted)' },
  },
  initialView: 'tree',
  initialFilters: { showComposables: true },
  tree: { stickyScopes: true, initialExpanded: true },
}} />
```

| Setting | Default | Purpose |
| --- | --- | --- |
| `chipColors` | Built-in palette | Partial overrides for `definition`, `resource`, `layout`, `state`, `composable`, `lazy`, `reference`, `active`, `inactive`, `unresolved`, `required`, `optional`, `included`, `custom`, `component`, and `config`. |
| `initialView` | `'graph'` | Starting view. |
| `initialFilters.activeOnly` | `false` | Start with the active filter enabled. |
| `initialFilters.showComposables` | `false` | Include declared composables initially. |
| `initialZoom` | `1` | Starting graph scale, clamped to `0.25–2`; non-finite values use `1`. |
| `tree.initialExpanded` | `true` | Start branches expanded or collapsed. |
| `tree.stickyScopes` | `true` | Keep the current ancestor chain visible while scrolling. |
| `showDetails` | `true` | Display the node-details pane. |

Each color override accepts a CSS color string (including named colors and CSS variables), or `{ color, background }`. When background is omitted, a subtle tint is derived using CSS `color-mix`. Node colors also apply to graph labels/borders and details so the views remain consistent. Color, sticky-scope, and details settings update when config changes. `initial*` settings initialize local UI state; they do not reset user choices on re-render. Tree expansion initializes each time the tree view is mounted.

Floating-button `position` and `initialIsOpen` remain standalone component props. `position` sets its starting corner. Drag the button with a mouse, touch, or pen to place it elsewhere; dragging does not open the panel. Its location survives panel open/close cycles while the component remains mounted and is kept inside the viewport when the window resizes. Keyboard users can move it with Alt+Arrow keys (10px), or Alt+Shift+Arrow keys (50px). A normal click, Enter, or Space opens the panel.

Selected-node details show a filterable Props section instead of a JSON dump. Search by name or type and filter by included/custom or required/optional. Each row shows the prop name, readable type (when its schema is available), requirement, origin, and the permitted supply locations for included props. All chips have hover/focus explanations using the same tooltip as the Graph/Tree switcher. Customize chips through `config.chipColors`, including `required`, `optional`, `included`, `custom`, `component`, and `config`.

Included props reuse existing options or composable props; custom props define additional inputs. `true` means required in creation config. `'optional'` permits omission and accepts values in config or on the component. The object form sets `visibility` and `passthrough` explicitly: required values use the chosen location; optional values can be supplied at either location. Inspection reads metadata without executing validators or render callbacks.

The React adapter has no runtime package dependencies. It bundles the framework-independent devtools core at build time and uses only the host app’s React and React DOM peers. Controls and shared tooltips use native React and DOM APIs, with no Tailwind, CSS imports, or provider setup. Some control styles were originally adapted from shadcn/ui; see `THIRD_PARTY_NOTICES` for attribution.

The details pane is absent until a node is selected, then slides in from the right (respecting reduced-motion preferences). Every selected node uses the same inspector layout: a clickable ancestor path, a node-kind badge, a mounted-count indicator, configuration/props when available, and a relationship tree. Relationships always use expandable tree branches grouped by direction and relationship kind, independent of the main Graph/Tree switcher. Selecting a relationship node opens its inspector. Breadcrumbs remain available regardless of graph/tree filters. The mounted indicator uses `chipColors.active` or `chipColors.inactive`; a separate `unresolved` chip identifies implementations that have not loaded.

Panel preferences are stored under `react-layout-devtools:preferences:v1` in local storage. Saved settings are authoritative; expand/collapse-all also persists the tree default. `config` supplies defaults when no preference is saved. View mode, graph filters, zoom, chip colors, tree defaults, details visibility, and the dragged FAB position survive remounts and page reloads. Selection and search text remain temporary. Pass `storageKey` to either component to isolate multiple inspectors. Same-tab instances and other tabs synchronize through storage notifications. Invalid entries fall back to defaults; unavailable storage uses an in-memory fallback.

Composable activity counts committed React instances rather than declarations. Repeated instances count separately, unused composables stay at zero, and unmounts clear their counts. Relationship edges still describe declared availability rather than JSX containment.

Use **Locate selection** to reveal the selected node in either view. It clears the
search and activity filters, enables composables, expands the selected node's tree
ancestors, and centers and focuses the node without scrolling the host page.

**Reset preferences** restores the defaults supplied through `config` (or the
built-in defaults when omitted), including zoom, view, filters, chip colors, tree
settings, and the FAB location. The reset is saved to the inspector's `storageKey`
and synchronizes with other inspectors using that key.

For development source locations, editor links, and per-instance render-state
preview controls, add the optional
[`@jfdevelops/react-layout-devtools-vite`](../devtools-vite/README.md) plugin.
The React adapter discovers these capabilities through devtools-core and does not
import or depend on Vite. Preview overrides are transient and excluded from saved
preferences.

## Production bundles

The default import renders nothing when `process.env.NODE_ENV` is `production`.
Bundlers that replace that expression (including Vite's normal application build)
can remove the inspector implementation, styles, and UI dependencies. Development
imports continue to render the full inspector.

With the optional Vite plugin, the default production build resolves directly to
an empty entry. To deliberately include the inspector:

```ts
reactLayoutDevtools({ production: true });
```

Without the Vite plugin, use the explicit always-enabled entry:

```tsx
import {
  ReactLayoutDevtools,
  ReactLayoutDevtoolsContent,
} from '@jfdevelops/react-layout-devtools-react/production';
```

`@jfdevelops/react-layout-devtools-react/disabled` always provides empty
components. All entries expose the same component props and public types. Build
systems using the default entry must replace `process.env.NODE_ENV` at build time
for bundle removal; a runtime `enabled` prop cannot remove imported code. The
library's existing inspection protocol remains part of the library runtime.
Production opt-in includes the inspector UI; source-location instrumentation and
state-preview injection remain development-only.

## Shared adapter configuration

`ReactLayoutDevtoolsConfig` extends `DevtoolsConfig` from devtools-core. Existing
React configuration works unchanged; defaults, color resolution, validation,
nested merging, and shared preference serialization are owned by devtools-core.
`DevtoolsConfig`, `DevtoolsPreferences`, and `DevtoolsSessionState` are also
re-exported as types from the React entry points.

The React adapter owns browser storage access, storage-event synchronization,
React hooks, and saved FAB coordinates. Search and selection use the shared
session-state type and remain transient. Existing saved settings and storage keys
continue to work without migration.

## Compact panel and composable content

The floating panel starts at up to 560 × 480 pixels and stays within the viewport.
Use its move handle to drag it, or drag the top-left resize grip up/left to enlarge
it. Both handles also support arrow keys; hold Shift for larger steps. Expand and
Dock controls provide a larger workspace. Position, size, and mode are saved with
the React panel preferences and cleared by Reset preferences.

Compact content starts in Explorer without pane-switching buttons. Selecting a
node opens Details, where a back arrow returns to Explorer.
The header and navigation stay fixed while the content scrolls. Wider embedded
containers use the explorer and inspector side by side. `layout="auto"` is the
default and observes the host width; use `layout="compact"` or `layout="split"`
for explicit control.

`ReactLayoutDevtoolsContent` accepts custom children and supplies shared state:

```tsx
import {
  ReactLayoutDevtoolsContent,
  ReactLayoutDevtoolsToolbar,
  ReactLayoutDevtoolsExplorer,
  ReactLayoutDevtoolsInspector,
} from '@jfdevelops/react-layout-devtools-react';

// Render this inside the container supplied by TanStack Devtools or another host.
<ReactLayoutDevtoolsContent source={layouts} layout="split">
  <ReactLayoutDevtoolsToolbar />
  <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <ReactLayoutDevtoolsExplorer />
    <ReactLayoutDevtoolsInspector />
  </div>
</ReactLayoutDevtoolsContent>;
```

For a completely custom outer layout, use `ReactLayoutDevtoolsProvider` with the
same `source`, `config`, and `storageKey` props. The provider adds no DOM, portal,
positioning, or fixed dimensions. `useReactLayoutDevtools()` exposes the graph,
selection, search, preferences, and their actions for custom controls.
`ReactLayoutDevtoolsFooter` and `ReactLayoutDevtoolsWorkspace` are optional pieces;
the workspace renders the default responsive arrangement.

All composed components must share a provider. Their default imports are disabled
in production just like the floating inspector; the `/production` entry enables
the entire composition API explicitly.

## Content Security Policy

If the host authorizes styles with a CSP nonce, pass the current response's nonce
as a prop. It applies to the shared animation/reduced-motion stylesheet across
floating, embedded, and custom provider compositions:

```tsx
<ReactLayoutDevtools source={layouts} nonce={responseNonce} />
```

`nonce` is request-specific and is never stored in preferences. `styleMode` is also
a render-time prop, rather than a saved setting.

For hosts that permit external stylesheets instead of inline `<style>` elements:

```tsx
import '@jfdevelops/react-layout-devtools-react/styles.css';

<ReactLayoutDevtoolsContent source={layouts} styleMode="external" />;
```

Load that stylesheet through the host's allowed CSS pipeline or stylesheet link,
in the same document or shadow root as the inspector. Development bundlers may
inject CSS imports into `<style>` tags; in that case configure the bundler's CSP
nonce support or use an actual allowed stylesheet link.
In external mode, the inspector injects no `<style>` element. For production
exclusion, load the external stylesheet only where the inspector is enabled too.

Inspector UI is client-only, so server rendering emits no devtools style tags or
style attributes. Client layout, dragging, colors, and tooltips use React's
individual DOM style-property assignments. CSP permits these assignments even
with `style-src-attr 'none'`; this differs from setting a `style` attribute or
`cssText`, which is blocked. A nonce authorizes a `<style>` element, not style
attributes. The host still needs to allow the application scripts themselves.

The development fixture at `/csp.html` in the Portless example runs with a nonce
style policy and `style-src-attr 'none'`, and displays a style-violation counter.
