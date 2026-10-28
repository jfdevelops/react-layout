export * from './debug';
import type {
  SourceLocation,
  PreviewInstance,
  PreviewController,
} from './debug';

/** Shared inspection protocol. This package has no React or DOM dependency. */
export const layoutInspection = Symbol.for(
  '@jfdevelops/react-layout/inspection'
);

export type NodeKind =
  | 'definition'
  | 'resource'
  | 'layout'
  | 'state'
  | 'composable'
  | 'component'
  | 'lazy';

/** Load lifecycle of a node whose implementation is imported on demand. */
export type LoadStatus = 'unresolved' | 'loading' | 'resolved' | 'error';

/** JSON-safe copy of an error, including its `cause` chain. */
export interface InspectionError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly stack?: string;
  readonly cause?: InspectionError;
}

export interface GraphNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
  readonly active: number;
  readonly unresolved?: boolean;
  /** Set on lazy nodes. `unresolved` stays true for both `loading` and `error`. */
  readonly status?: LoadStatus;
  /** The failure reported when `status` is `error`. */
  readonly error?: InspectionError;
  readonly source?: SourceLocation;
  readonly registrationSource?: SourceLocation;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly relationship:
    | 'contains'
    | 'defines'
    | 'renders'
    | 'declares'
    | 'references';
}

export interface GraphSnapshot {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly instances?: readonly PreviewInstance[];
}

export interface InspectionSource {
  getSnapshot(): GraphSnapshot;
  subscribe(listener: () => void): () => void;
  preview?(instance: string, state?: string): void;
  connectPreview?(): () => void;
}

const maxCauseDepth = 5;

/** Converts any thrown value into a JSON-safe {@link InspectionError}. */
export function serializeInspectionError(
  error: unknown,
  depth = 0
): InspectionError {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const cause = (error as { cause?: unknown }).cause;

    return {
      name: error.name,
      message: error.message,
      code: typeof code === 'string' ? code : undefined,
      stack: error.stack,
      cause:
        cause !== undefined && depth < maxCauseDepth
          ? serializeInspectionError(cause, depth + 1)
          : undefined,
    };
  }

  return { name: typeof error, message: String(error) };
}

let sequence = 0;

export function inspectionId(prefix: string): string {
  return `${prefix}:${++sequence}`;
}

export function getInspectionSource(value: object): InspectionSource {
  const candidate =
    (value as Record<symbol, unknown>)[layoutInspection] ?? value;

  if (
    candidate &&
    typeof candidate === 'object' &&
    'getSnapshot' in candidate &&
    typeof candidate.getSnapshot === 'function' &&
    'subscribe' in candidate &&
    typeof candidate.subscribe === 'function'
  ) {
    return candidate as InspectionSource;
  }

  throw new TypeError(
    'LayoutDevtools source must be a layout definition or factory from a compatible react-layout version.'
  );
}

/** Mutable producer API; adapters consume only InspectionSource. */
export function createInspectionStore() {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const listeners = new Set<() => void>();
  const children = new Map<InspectionSource, () => void>();
  const instances = new Map<string, PreviewInstance>();
  const controllers = new Map<string, PreviewController>();
  const sessions = new Set<symbol>();
  const childSessions = new Map<InspectionSource, () => void>();
  let snapshot: GraphSnapshot | undefined;

  function changed() {
    snapshot = undefined;

    for (const listener of [...listeners]) listener();
  }

  const store = {
    getSnapshot(): GraphSnapshot {
      if (!snapshot) {
        const childSnapshots = [...children.keys()].map((child) =>
          child.getSnapshot()
        );

        snapshot = Object.freeze({
          nodes: Object.freeze([
            ...nodes.values(),
            ...childSnapshots.flatMap((s) => s.nodes),
          ]),
          instances: Object.freeze([
            ...instances.values(),
            ...childSnapshots.flatMap((s) => s.instances ?? []),
          ]),
          edges: Object.freeze([
            ...edges.values(),
            ...childSnapshots.flatMap((s) => s.edges),
          ]),
        });
      }

      return snapshot;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    registerPreview(instance: PreviewInstance, controller: PreviewController) {
      instances.set(instance.id, Object.freeze({ ...instance }));

      controllers.set(instance.id, controller);

      changed();

      return () => {
        instances.delete(instance.id);

        controllers.delete(instance.id);

        changed();
      };
    },

    preview(instanceId: string, state?: string) {
      const instance = instances.get(instanceId);

      if (!instance) {
        for (const child of children.keys()) {
          if (
            child
              .getSnapshot()
              .instances?.some((entry) => entry.id === instanceId)
          ) {
            child.preview?.(instanceId, state);

            return;
          }
        }

        return;
      }

      if (state !== undefined && !instance.states.includes(state))
        throw new Error('Unknown render state');

      controllers.get(instanceId)?.(state);

      instances.set(
        instanceId,
        Object.freeze({ ...instance, forcedState: state, error: undefined })
      );

      changed();
    },

    previewError(instanceId: string, error: string) {
      const instance = instances.get(instanceId);

      if (instance) {
        instances.set(instanceId, Object.freeze({ ...instance, error }));

        changed();
      }
    },

    connectPreview() {
      const token = Symbol();

      sessions.add(token);

      if (sessions.size === 1) {
        for (const child of children.keys()) {
          if (child.connectPreview)
            childSessions.set(child, child.connectPreview());
        }
      }

      return () => {
        if (!sessions.delete(token) || sessions.size) return;

        for (const instance of instances.values()) {
          if (instance.forcedState !== undefined) store.preview(instance.id);
        }

        for (const release of childSessions.values()) release();

        childSessions.clear();
      };
    },

    node(node: Omit<GraphNode, 'active'> & { active?: number }) {
      nodes.set(
        node.id,
        Object.freeze({
          ...node,
          source: node.source ?? nodes.get(node.id)?.source,
          registrationSource:
            node.registrationSource ?? nodes.get(node.id)?.registrationSource,
          active: nodes.get(node.id)?.active ?? node.active ?? 0,
          details: node.details && Object.freeze({ ...node.details }),
        })
      );

      changed();

      return node.id;
    },

    edge(
      source: string,
      target: string,
      relationship: GraphEdge['relationship']
    ) {
      const id = `${source}/${relationship}/${target}`;

      if (!edges.has(id)) {
        edges.set(id, Object.freeze({ id, source, target, relationship }));

        changed();
      }
    },

    mount(...ids: string[]) {
      for (const id of new Set(ids)) {
        const node = nodes.get(id);

        if (node)
          nodes.set(id, Object.freeze({ ...node, active: node.active + 1 }));
      }

      changed();

      let mounted = true;

      return () => {
        if (!mounted) return;

        mounted = false;

        for (const id of new Set(ids)) {
          const node = nodes.get(id);

          if (node)
            nodes.set(
              id,
              Object.freeze({ ...node, active: Math.max(0, node.active - 1) })
            );
        }

        changed();
      };
    },

    connect(value: object) {
      const child = getInspectionSource(value);

      if (child === store || children.has(child)) return;

      children.set(child, child.subscribe(changed));

      if (sessions.size && child.connectPreview)
        childSessions.set(child, child.connectPreview());

      changed();
    },

    attach<T extends object>(value: T): T {
      Object.defineProperty(value, layoutInspection, {
        value: store,
        enumerable: true,
      });

      return value;
    },
  };

  return store;
}

export type InspectionStore = ReturnType<typeof createInspectionStore>;

export interface PositionedNode {
  readonly node: GraphNode;
  readonly x: number;
  readonly y: number;
}

/** Deterministic layered layout with cycle protection for reference edges. */
export function layoutGraph(graph: GraphSnapshot): readonly PositionedNode[] {
  const depth = new Map<string, number>();
  const hierarchy = graph.edges.filter((e) => e.relationship !== 'references');
  const incoming = new Map(graph.nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<string, GraphEdge[]>();

  for (const edge of hierarchy) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);

    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  const queue = graph.nodes
    .filter((n) => incoming.get(n.id) === 0)
    .map((n) => n.id);

  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    const level = depth.get(id) ?? 0;

    for (const edge of outgoing.get(id) ?? []) {
      depth.set(edge.target, Math.max(depth.get(edge.target) ?? 0, level + 1));

      incoming.set(edge.target, incoming.get(edge.target)! - 1);

      if (incoming.get(edge.target) === 0) queue.push(edge.target);
    }
  }

  const rows = new Map<number, number>();

  return graph.nodes.map((node) => {
    const level = depth.get(node.id) ?? 0;
    const row = rows.get(level) ?? 0;

    rows.set(level, row + 1);

    return { node, x: 32 + level * 280, y: 32 + row * 100 };
  });
}

export interface InspectionTreeNode {
  readonly node: GraphNode;
  readonly relationship?: GraphEdge['relationship'];
  readonly reference?: boolean;
  readonly children: readonly InspectionTreeNode[];
}

/** A spanning hierarchy; shared/reference relationships remain explicit leaf links. */
export function buildInspectionTree(
  graph: GraphSnapshot
): readonly InspectionTreeNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const parents = new Map<string, GraphEdge>();
  const priority = {
    contains: 0,
    renders: 1,
    defines: 2,
    declares: 3,
    references: 4,
  };

  for (const edge of graph.edges) {
    if (
      edge.relationship === 'references' ||
      !byId.has(edge.source) ||
      !byId.has(edge.target)
    )
      continue;

    const existing = parents.get(edge.target);

    if (
      !existing ||
      priority[edge.relationship] < priority[existing.relationship]
    )
      parents.set(edge.target, edge);
  }

  const seen = new Set<string>();

  function branch(
    node: GraphNode,
    path: ReadonlySet<string>,
    relationship?: GraphEdge['relationship']
  ): InspectionTreeNode {
    if (path.has(node.id))
      return { node, relationship, reference: true, children: [] };

    seen.add(node.id);

    const next = new Set([...path, node.id]);
    const children = graph.edges
      .filter((edge) => edge.source === node.id)
      .flatMap((edge) => {
        const target = byId.get(edge.target);

        if (!target) return [];

        if (parents.get(edge.target)?.id === edge.id)
          return [branch(target, next, edge.relationship)];

        // The chosen resource owner already explains definition → layout edges.
        if (edge.relationship !== 'references') return [];

        return [
          {
            node: target,
            relationship: edge.relationship,
            reference: true,
            children: [],
          },
        ];
      });

    return { node, relationship, children };
  }

  const roots = graph.nodes
    .filter((node) => !parents.has(node.id))
    .map((node) => branch(node, new Set()));

  for (const node of graph.nodes)
    if (!seen.has(node.id)) roots.push(branch(node, new Set()));

  return roots;
}

export {
  inspectPropValidator,
  mapInspectionDetails,
  describePropValidator,
  formatInspectionDetails,
} from './format-details';

export * from './config';
export * from './preferences';
