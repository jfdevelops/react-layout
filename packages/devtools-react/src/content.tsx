import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import {
  useId,
  useEffect,
  useRef,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import {
  getInspectionSource,
  layoutGraph,
  type GraphNode,
} from '@jfdevelops/react-layout-devtools-core';
import { control } from './theme';
import {
  initialGraphZoom,
  resolveChipColors,
  type ReactLayoutDevtoolsConfig,
} from './config';
import { InspectionTree } from './tree';
import { ViewSwitcher } from './view-switcher';
import { SelectedNode } from './selected-node';
import { usePanelPreferences } from './preferences';
export interface ReactLayoutDevtoolsContentProps {
  /** A defineResourceLayout result or createDefinedResourceLayout factory. */
  source: object;
  config?: ReactLayoutDevtoolsConfig;
  /** Override to isolate preferences for a separate inspector. */
  storageKey?: string;
  className?: string;
  style?: CSSProperties;
}
/** Optional, provider-free layout graph. All inspection logic lives in devtools-core. */
export function ReactLayoutDevtoolsContent({
  source,
  config: defaults,
  storageKey,
  className,
  style,
}: ReactLayoutDevtoolsContentProps) {
  const [config, updatePreferences, resetPreferences] = usePanelPreferences(
    defaults,
    storageKey
  );
  const arrowId = `layout-arrow-${useId().replaceAll(':', '')}`;
  const inspector = useMemo(() => getInspectionSource(source), [source]);
  const graph = useSyncExternalStore(
    inspector.subscribe,
    inspector.getSnapshot,
    inspector.getSnapshot
  );
  useEffect(() => inspector.connectPreview?.(), [inspector]);
  const [query, setQuery] = useState('');
  const view = config.initialView;
  const activeOnly = config.initialFilters.activeOnly;
  const showComposables = config.initialFilters.showComposables;
  const zoom = config.initialZoom;
  const setView = (initialView: 'graph' | 'tree') =>
    updatePreferences({ initialView });
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
  const [selected, setSelected] = useState<string>();
  const [treeRevision, setTreeRevision] = useState(0);
  const [locateRequest, setLocateRequest] = useState(0);
  const graphPane = useRef<HTMLDivElement>(null);
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
    setQuery('');
    updatePreferences({
      initialFilters: { activeOnly: false, showComposables: true },
    });
    setLocateRequest((request) => request + 1);
  }
  useEffect(() => {
    if (!locateRequest || view !== 'graph') return;
    const element = graphPane.current?.querySelector<HTMLElement>(
      '[data-selected-node="true"]'
    );
    if (element) reveal(element);
  }, [locateRequest, view]);
  const palette = resolveChipColors(config?.chipColors);
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
              .includes(query.toLowerCase())
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
  }, [graph, activeOnly, query, showComposables]);
  const positioned = useMemo(() => layoutGraph(displayGraph), [displayGraph]);
  const positions = new Map(positioned.map((p) => [p.node.id, p]));
  const selection = graph.nodes.find((n) => n.id === selected);
  const detailsPane = useRef<HTMLElement>(null);
  useEffect(() => {
    if (detailsPane.current) detailsPane.current.scrollTop = 0;
  }, [selection?.id]);
  const width = Math.max(800, ...positioned.map((p) => p.x + 260));
  const height = Math.max(360, ...positioned.map((p) => p.y + 92));
  return (
    <section
      aria-label="Layout devtools"
      className={className}
      style={{
        background: '#0b1220',
        color: '#e2e8f0',
        border: '1px solid #334155',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        font: '13px/1.5 ui-sans-serif, system-ui, sans-serif',
        ...style,
      }}
    >
      <style>{`
        @keyframes react-layout-details-enter { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { [data-react-layout-details] { animation: none !important; } }
      `}</style>
      <header style={{ borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
          }}
        >
          <div>
            <strong style={{ fontSize: 15 }}>Layouts</strong>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {graph.nodes.filter((n) => n.kind === 'layout').length} layouts ·{' '}
              {
                graph.nodes.filter((n) => n.kind === 'state' && n.active > 0)
                  .length
              }{' '}
              active states
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="button"
              disabled={!selection}
              onClick={locateSelection}
              style={control}
            >
              Locate selection
            </Button>
            <Button
              type="button"
              onClick={() => {
                resetPreferences();
                setLocateRequest(0);
                setTreeRevision((revision) => revision + 1);
              }}
              style={control}
            >
              Reset preferences
            </Button>
            <ViewSwitcher value={view} onChange={setView} />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px 20px',
            padding: '0 16px 12px',
          }}
        >
          <Input
            aria-label="Search graph"
            placeholder="Search resources, states…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...control, flex: '1 1 200px', minWidth: 0 }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                color: '#cbd5e1',
              }}
            >
              <input
                type="checkbox"
                checked={showComposables}
                onChange={(e) => setShowComposables(e.target.checked)}
              />{' '}
              Composables
            </label>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                color: '#cbd5e1',
              }}
            >
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />{' '}
              Active only
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {view === 'graph' && (
              <>
                <Button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  style={control}
                >
                  -
                </Button>
                <Button
                  type="button"
                  aria-label="Reset zoom"
                  onClick={() => setZoom(1)}
                  style={control}
                >
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                  style={control}
                >
                  +
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <div
        style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <div
          ref={graphPane}
          tabIndex={0}
          role="region"
          aria-label="Scrollable relationship graph"
          style={{
            overflow: 'auto',
            flex: '3 1 0%',
            minWidth: 0,
            minHeight: 0,
            overscrollBehavior: 'contain',
          }}
        >
          {displayGraph.nodes.length === 0 ? (
            <p style={{ padding: 24 }}>
              {graph.nodes.length
                ? 'No nodes match these filters.'
                : 'No definitions registered yet. Import a layout module to see it here.'}
            </p>
          ) : view === 'tree' ? (
            <InspectionTree
              key={treeRevision}
              locateRequest={locateRequest}
              onLocate={reveal}
              palette={palette}
              config={config?.tree}
              onExpandedChange={(initialExpanded) =>
                updatePreferences({ tree: { ...config.tree, initialExpanded } })
              }
              graph={displayGraph}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <svg
              aria-label="Layout relationships"
              width={width * zoom}
              height={height * zoom}
              style={{ display: 'block' }}
            >
              <defs>
                <marker
                  id={arrowId}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>
              <g transform={`scale(${zoom})`}>
                {displayGraph.edges.map((edge) => {
                  const a = positions.get(edge.source),
                    b = positions.get(edge.target);
                  if (!a || !b) return null;
                  const x = a.x + 224,
                    y = a.y + 32,
                    targetY = b.y + 32;
                  return (
                    <g key={edge.id}>
                      <path
                        d={`M${x},${y} C${x + 32},${y} ${b.x - 32},${targetY} ${
                          b.x
                        },${targetY}`}
                        fill="none"
                        stroke="#64748b"
                        strokeDasharray={
                          edge.relationship === 'references' ? '5 4' : undefined
                        }
                        markerEnd={`url(#${arrowId})`}
                      />
                      <title>
                        {a.node.label} {edge.relationship} {b.node.label}
                      </title>
                    </g>
                  );
                })}
                {positioned.map(({ node, x, y }) => (
                  <g key={node.id} transform={`translate(${x},${y})`}>
                    <foreignObject width={228} height={74}>
                      <Button
                        type="button"
                        data-selected-node={selected === node.id}
                        aria-pressed={selected === node.id}
                        onClick={() => setSelected(node.id)}
                        style={{
                          width: 224,
                          height: 68,
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: '8px 12px',
                          color: '#e2e8f0',
                          background: node.active
                            ? palette.active.background
                            : '#162033',
                          border: `2px solid ${
                            selected === node.id
                              ? '#fff'
                              : node.active
                              ? palette.active.color
                              : palette[node.kind].color
                          }`,
                          borderRadius: 8,
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            color: palette[node.kind].color,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                          }}
                        >
                          {node.kind}
                          {node.active > 0 ? ` · active (${node.active})` : ''}
                          {node.unresolved ? ' · unresolved' : ''}
                        </span>
                        <strong
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={node.label}
                        >
                          {node.label}
                        </strong>
                      </Button>
                    </foreignObject>
                  </g>
                ))}
              </g>
            </svg>
          )}
        </div>
        {config?.showDetails !== false && selection && (
          <aside
            ref={detailsPane}
            data-react-layout-details
            aria-label="Node details"
            style={{
              flex: '2 1 0%',
              animation:
                'react-layout-details-enter 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
              minHeight: 0,
              boxSizing: 'border-box',
              overscrollBehavior: 'contain',
              minWidth: 0,
              padding: 18,
              borderLeft: '1px solid #334155',
              overflow: 'auto',
            }}
          >
            <SelectedNode
              inspector={inspector}
              key={selection.id}
              node={selection}
              graph={graph}
              palette={palette}
              onSelect={setSelected}
            />
          </aside>
        )}
      </div>
      <footer
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          color: '#94a3b8',
          borderTop: '1px solid #334155',
        }}
      >
        Resources → layouts → states → declared composables · Active means
        mounted in React.
      </footer>
    </section>
  );
}
