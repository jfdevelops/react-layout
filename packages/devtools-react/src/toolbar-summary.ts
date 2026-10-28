import type {
  GraphNode,
  GraphSnapshot,
} from '@jfdevelops/react-layout-devtools-core';

type PreviewInstance = NonNullable<GraphSnapshot['instances']>[number];

export interface ToolbarSummary {
  activeLayouts: number;
  loading: number;
  failed: number;
  /** The most recently mounted layout, e.g. `appointments · default`. */
  current?: {
    resource: string;
    /** Omitted when no state of the layout is mounted. */
    state?: string;
    /** Present when the layout can be previewed in another state. */
    instance?: PreviewInstance;
  };
}

/** Live counts and the current layout for the collapsed toolbar. */
export function summarizeGraph(graph: GraphSnapshot): ToolbarSummary {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const isActive = (id: string) => (byId.get(id)?.active ?? 0) > 0;
  const instances = graph.instances ?? [];
  // Instances register on mount, so the last active one is the newest.
  const instance =
    [...instances].reverse().find((entry) => isActive(entry.layout)) ??
    instances.at(-1);
  const layout = instance
    ? byId.get(instance.layout)
    : [...graph.nodes]
        .reverse()
        .find((node) => node.kind === 'layout' && node.active > 0);
  let current: ToolbarSummary['current'];

  if (layout) {
    const resource = graph.edges
      .filter(
        (edge) =>
          edge.target === layout.id && byId.get(edge.source)?.kind === 'resource'
      )
      .map((edge) => byId.get(edge.source)!)[0];
    const stateId = instance
      ? instance.forcedState ?? instance.state
      : graph.edges.find(
          (edge) =>
            edge.source === layout.id &&
            edge.relationship === 'defines' &&
            byId.get(edge.target)?.kind === 'state' &&
            isActive(edge.target)
        )?.target;

    current = {
      resource: shortLabel(resource ?? layout),
      state: stateId && (byId.get(stateId)?.label ?? stateId),
      instance,
    };
  }

  return {
    activeLayouts: graph.nodes.filter(
      (node) => node.kind === 'layout' && node.active > 0
    ).length,
    loading: graph.nodes.filter((node) => node.status === 'loading').length,
    failed: graph.nodes.filter((node) => node.status === 'error').length,
    current,
  };
}

function shortLabel(node: GraphNode) {
  return node.kind === 'resource'
    ? node.label.split('.').at(-1) ?? node.label
    : node.label;
}
