# React Layout Devtools Core

A framework-independent inspection protocol, external store, and deterministic graph layout. No React or DOM dependency. The React adapter uses this package; future adapters can subscribe to the same sources.

```ts
import { getInspectionSource, layoutGraph } from '@jfdevelops/react-layout-devtools-core';

const source = getInspectionSource(layouts);
const unsubscribe = source.subscribe(() => {
  const graph = source.getSnapshot();
  const positions = layoutGraph(graph);
  // Update your adapter.
});
// Read once immediately, too: sources retain activity before subscription.
const graph = source.getSnapshot();
// Dispose when your adapter is removed:
unsubscribe();
```

Snapshots have readonly `nodes` and `edges`; node IDs remain stable for the lifetime of a definition. `active` is a mounted instance count, and `unresolved` describes lazy declarations. Edges distinguish containment, definitions, rendering, declared composables, and explicit references. A snapshot retains its identity until the source changes, making it compatible with external-store adapters.

Core exports `InspectionSource`, `GraphSnapshot`, `GraphNode`, `GraphEdge`, `layoutInspection`, `createInspectionStore`, `inspectionId`, and `layoutGraph`, and `buildInspectionTree`. The producer API registers metadata and mount lifecycles; consumers should depend on `InspectionSource`. Sources retain metadata for their factory/definition lifetime; activity is removed on unmount.

`describePropValidator` and `formatInspectionDetails` turn validator metadata into readable types without calling validators or render callbacks. Descriptions include required/optional visibility, literal/enum values, unions, nested object properties, records, React nodes/elements, and render-prop signatures. Ordinary functions remain explicitly labeled as functions; circular structures are handled safely.

Development adapters may supply `source` / `registrationSource` on graph nodes
and opt into the `layoutDebug` metadata symbol. Source locations contain a file,
line, column, and optional same-origin editor URL. Producers can register mounted
`PreviewInstance` entries with `registerPreview`; adapters use the optional
`preview(instanceId, stateId?)` command and `connectPreview()` session lifetime.
Omitting the state returns an instance to Auto. Composed stores route commands to
the owning producer; the final inspector disconnect resets forced instances.
