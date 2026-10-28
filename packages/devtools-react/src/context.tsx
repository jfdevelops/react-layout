import {
  createContext,
  useContext,
  useId,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useDeferredValue,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  getInspectionSource,
  layoutGraph,
  subscribeInspectionBatched,
  type DevtoolsSessionState,
} from '@jfdevelops/react-layout-devtools-core';
import {
  initialGraphZoom,
  resolveChipColors,
  type ReactLayoutDevtoolsConfig,
} from './config';
import { DevtoolsStyles } from './styles';
import { usePanelPreferences } from './preferences';

export interface ReactLayoutDevtoolsProviderProps {
  source: object;
  /** Per-response CSP nonce. Never persisted to preferences. */
  nonce?: string;
  /** Use external when the host loads the exported styles.css asset. */
  styleMode?: 'inline' | 'external';
  config?: ReactLayoutDevtoolsConfig;
  storageKey?: string;
  layout?: 'compact' | 'split';
  children: ReactNode;
}

function useController({
  source,
  config: defaults,
  storageKey,
  layout = 'split',
}: Omit<ReactLayoutDevtoolsProviderProps, 'children'>) {
  const compact = layout === 'compact';
  const [pane, setPane] = useState<'explorer' | 'inspector'>('explorer');
  const [config, updatePreferences, resetSavedPreferences] =
    usePanelPreferences(defaults, storageKey);
  const arrowId = `layout-arrow-${useId().replaceAll(':', '')}`;
  const inspector = useMemo(() => getInspectionSource(source), [source]);
  const graph = useSyncExternalStore(
    useMemo(
      () => (listener: () => void) =>
        subscribeInspectionBatched(inspector, listener),
      [inspector]
    ),
    inspector.getSnapshot,
    inspector.getSnapshot
  );

  useEffect(() => inspector.connectPreview?.(), [inspector]);

  const [hovered, setHovered] = useState<string>();
  const [session, setSession] = useState<DevtoolsSessionState>({ query: '' });
  const { query, selectedNode: selected } = session;

  const deferredQuery = useDeferredValue(query);
  const setQuery = useCallback((query: string) => {
    setSession((current) =>
      current.query === query ? current : { ...current, query }
    );
  }, []);

  const setSelected = useCallback((selectedNode: string) => {
    if (compact && config.showDetails) setPane('inspector');

    setSession((current) =>
      current.selectedNode === selectedNode
        ? current
        : { ...current, selectedNode }
    );
  }, [compact, config.showDetails]);

  const view = config.initialView;
  const activeOnly = config.initialFilters.activeOnly;
  const showComposables = config.initialFilters.showComposables;
  const zoom = config.initialZoom;

  const setView = (initialView: 'graph' | 'tree') => {
    updatePreferences({ initialView });

    setPane('explorer');
  };

  const setActiveOnly = (activeOnly: boolean) =>
    updatePreferences({
      initialFilters: { ...config.initialFilters, activeOnly },
    });

  const setShowComposables = (showComposables: boolean) =>
    updatePreferences({
      initialFilters: { ...config.initialFilters, showComposables },
    });

  const setZoom = (change: number | ((previous: number) => number)) =>
    updatePreferences({
      initialZoom: initialGraphZoom(
        typeof change === 'function' ? change(zoom) : change
      ),
    });

  const [treeRevision, setTreeRevision] = useState(0);
  const [locateRequest, setLocateRequest] = useState(0);
  const graphPane = useRef<HTMLDivElement>(null);
  const explorerScroll = useRef({ left: 0, top: 0 });
  const restoreExplorerFocus = useRef(false);

  function backToExplorer() {
    restoreExplorerFocus.current = true;

    setPane('explorer');
  }

  useEffect(() => {
    if (pane !== 'explorer' || !restoreExplorerFocus.current) return;

    restoreExplorerFocus.current = false;

    const element =
      graphPane.current?.querySelector<HTMLElement>(
        `[data-view="${view}"] :is([aria-selected="true"], [data-selected-node="true"])`
      ) ?? graphPane.current;

    element?.focus({ preventScroll: true });
  }, [pane]);

  function resetPreferences() {
    resetSavedPreferences();

    setLocateRequest(0);

    revealedRequest.current = 0;

    setTreeRevision((revision) => revision + 1);

    setPane('explorer');
  }

  function reveal(element: HTMLElement) {
    const pane = graphPane.current;

    if (!pane) return;

    const bounds = element.getBoundingClientRect();
    const viewport = pane.getBoundingClientRect();

    pane.scrollTo({
      left:
        pane.scrollLeft +
        bounds.left -
        viewport.left -
        (pane.clientWidth - bounds.width) / 2,
      top:
        pane.scrollTop +
        bounds.top -
        viewport.top -
        (pane.clientHeight - bounds.height) / 2,
    });

    element.focus({ preventScroll: true });
  }

  function locateSelection() {
    setPane('explorer');

    setQuery('');

    updatePreferences({
      initialFilters: { activeOnly: false, showComposables: true },
    });

    setLocateRequest((request) => request + 1);
  }

  const revealedRequest = useRef(0);
  const chipColorsKey = JSON.stringify(config.chipColors);
  const palette = useMemo(
    () => resolveChipColors(config.chipColors),
    // Configs are often inline objects; key on content so cards stay memoized.
    [chipColorsKey]
  );
  const displayGraph = useMemo(() => {
    const candidates = graph.nodes.filter(
      (node) => showComposables || node.kind !== 'composable'
    );
    const visible = new Set(
      candidates
        .filter(
          (node) =>
            (!activeOnly || node.active > 0) &&
            `${node.label} ${node.kind}`
              .toLowerCase()
              .includes(deferredQuery.toLowerCase())
        )
        .map((node) => node.id)
    );
    // Retain ancestors so filtering preserves the explanation of each match.
    let added = true;

    while (added) {
      added = false;

      for (const edge of graph.edges) {
        if (visible.has(edge.target) && !visible.has(edge.source)) {
          visible.add(edge.source);

          added = true;
        }
      }
    }

    const nodes = candidates.filter((node) => visible.has(node.id));
    const nodeIds = new Set(nodes.map((node) => node.id));

    return {
      nodes,
      edges: graph.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      ),
    };
  }, [graph, activeOnly, deferredQuery, showComposables]);
  const positioned = useMemo(() => layoutGraph(displayGraph), [displayGraph]);
  const positions = useMemo(
    () => new Map(positioned.map((p) => [p.node.id, p])),
    [positioned]
  );

  // Retries as the deferred search catches up after locate clears filters.
  useEffect(() => {
    if (
      !locateRequest ||
      view !== 'graph' ||
      revealedRequest.current === locateRequest
    )
      return;

    const element = graphPane.current?.querySelector<HTMLElement>(
      '[data-view="graph"] [data-selected-node="true"]'
    );

    if (!element) return;

    revealedRequest.current = locateRequest;

    reveal(element);
  }, [locateRequest, view, positioned]);
  const selection = graph.nodes.find((n) => n.id === selected);
  const detailsPane = useRef<HTMLElement>(null);

  useEffect(() => {
    if (detailsPane.current) {
      detailsPane.current.scrollTop = 0;

      if (compact && pane === 'inspector')
        detailsPane.current.focus({ preventScroll: true });
    }
  }, [selection?.id, pane, compact]);

  const width = Math.max(800, ...positioned.map((p) => p.x + 260));
  const height = Math.max(360, ...positioned.map((p) => p.y + 92));

  return {
    config,
    hovered,
    setHovered,
    updatePreferences,
    resetPreferences,
    graph,
    inspector,
    query,
    setQuery,
    selected,
    setSelected,
    view,
    setView,
    activeOnly,
    setActiveOnly,
    showComposables,
    setShowComposables,
    zoom,
    setZoom,
    treeRevision,
    setTreeRevision,
    locateRequest,
    setLocateRequest,
    graphPane,
    explorerScroll,
    backToExplorer,
    reveal,
    locateSelection,
    palette,
    displayGraph,
    positioned,
    positions,
    selection,
    detailsPane,
    width,
    height,
    arrowId,
    compact,
    pane,
    setPane,
  };
}

const DevtoolsContext = createContext<ReturnType<typeof useController> | null>(
  null
);

export function ReactLayoutDevtoolsProvider({
  children,
  ...props
}: ReactLayoutDevtoolsProviderProps) {
  const controller = useController(props);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Inspector UI is client-only: SSR must not emit blocked style attributes.
  if (!mounted) return null;

  return (
    <DevtoolsContext.Provider value={controller}>
      <DevtoolsStyles nonce={props.nonce} styleMode={props.styleMode} />
      {children}
    </DevtoolsContext.Provider>
  );
}

export function useDevtoolsContext() {
  const value = useContext(DevtoolsContext);

  if (!value)
    throw new Error(
      'Devtools components must be inside ReactLayoutDevtoolsProvider or ReactLayoutDevtoolsContent.'
    );

  return value;
}

/** Shared state and actions for custom inspector compositions. */
export function useReactLayoutDevtools() {
  const value = useDevtoolsContext();

  return {
    graph: value.graph,
    selection: value.selection,
    pane: value.pane,
    backToExplorer: value.backToExplorer,
    selectNode: value.setSelected,
    query: value.query,
    setQuery: value.setQuery,
    preferences: value.config,
    updatePreferences: value.updatePreferences,
    resetPreferences: value.resetPreferences,
  };
}
