import { ComposableOutlines, OutlineToggle } from './outlines';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { HelpTooltip } from './components/ui/tooltip';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { control } from './theme';
import { InspectionTree } from './tree';
import { ViewSwitcher } from './view-switcher';
import { SelectedNode } from './selected-node';
import { StateIcon } from './state-icon';
import { useExplorerViewport } from './use-explorer-viewport';
import type { ChipPalette } from './config';
import type { GraphNode } from '@jfdevelops/react-layout-devtools-core';
import {
  ReactLayoutDevtoolsProvider,
  useDevtoolsContext,
  type ReactLayoutDevtoolsProviderProps,
} from './context';

export { ReactLayoutDevtoolsProvider, useReactLayoutDevtools } from './context';
export type { ReactLayoutDevtoolsProviderProps } from './context';

export interface ReactLayoutDevtoolsContentProps
  extends Omit<ReactLayoutDevtoolsProviderProps, 'layout' | 'children'> {
  layout?: 'auto' | 'compact' | 'split';
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const VIRTUALIZE_AFTER = 200;
const OVERSCAN = 100;

export function ReactLayoutDevtoolsToolbar() {
  const {
    resetPreferences,
    config,
    graph,
    query,
    setQuery,
    view,
    setView,
    activeOnly,
    setActiveOnly,
    showComposables,
    setShowComposables,
    zoom,
    setZoom,
    locateSelection,
    selection,
    compact,
    pane,
    backToExplorer,
  } = useDevtoolsContext();

  return (
    <>
      <ComposableOutlines />
      <header
        style={{
          position: 'relative',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {compact &&
              pane === 'inspector' &&
              selection &&
              config.showDetails && (
                <HelpTooltip content="Back to explorer">
                  <Button
                    aria-label="Back to explorer"
                    onClick={backToExplorer}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M19 12H5m7-7-7 7 7 7" />
                    </svg>
                  </Button>
                </HelpTooltip>
              )}
            <div>
              <strong style={{ fontSize: 15 }}>Layouts</strong>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                {graph.nodes.filter((n) => n.kind === 'layout').length} layouts
                ·{' '}
                {
                  graph.nodes.filter((n) => n.kind === 'state' && n.active > 0)
                    .length
                }{' '}
                active states
                {graph.nodes.some((node) => node.kind === 'lazy') && (
                  <> · {graph.nodes.filter((node) => node.kind === 'lazy').length} lazy declarations
                    {graph.nodes.some((node) => node.kind === 'lazy' && node.status === 'error') &&
                      <> · {graph.nodes.filter((node) => node.kind === 'lazy' && node.status === 'error').length} failed</>}
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpTooltip content="Locate selection">
              <Button
                type="button"
                aria-label="Locate selection"
                title="Locate selection"
                disabled={!selection}
                onClick={locateSelection}
                style={control}
              >
                ⌖
              </Button>
            </HelpTooltip>
            <OutlineToggle />
            <HelpTooltip content="Reset preferences">
              <Button
                type="button"
                aria-label="Reset preferences"
                title="Reset preferences"
                onClick={resetPreferences}
                style={control}
              >
                ↺
              </Button>
            </HelpTooltip>
            <ViewSwitcher value={view} onChange={setView} />
          </div>
        </div>
        {(!compact || pane === 'explorer') && (
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
        )}
      </header>
    </>
  );
}

/** Memoized so selection and hover only re-render the two cards that changed. */
const GraphCard = memo(function GraphCard({
  node,
  x,
  y,
  selected,
  hovered,
  palette,
  onSelect,
}: {
  node: GraphNode;
  x: number;
  y: number;
  selected: boolean;
  hovered: boolean;
  palette: ChipPalette;
  onSelect: (id: string) => void;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject width={228} height={74}>
        <Button
          type="button"
          data-selected-node={selected}
          data-hovered-node={hovered}
          aria-pressed={selected}
          onClick={() => onSelect(node.id)}
          style={{
            width: 224,
            height: 68,
            textAlign: 'left',
            cursor: 'pointer',
            padding: '8px 12px',
            color: '#e2e8f0',
            background: hovered
            ? palette.composable.background
            : node.active
              ? palette.active.background
              : '#162033',
            border: `2px solid ${
              selected
                ? '#fff'
                : node.status === 'error'
                ? palette.error.color
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
            {node.status === 'error'
              ? ' · error'
              : node.status === 'loading'
                ? ' · loading'
                : node.unresolved
                  ? ' · unresolved'
                  : ''}
          </span>
          <strong
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title={node.label}
          >
            {node.kind === 'state' && (
              <StateIcon
                state={node.label}
                palette={palette}
                spinning={node.active > 0}
              />
            )}
            <span
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.label}
            </span>
          </strong>
        </Button>
      </foreignObject>
    </g>
  );
});

export function ReactLayoutDevtoolsExplorer() {
  const {
    config,
    updatePreferences,
    graph,
    selected,
    hovered,
    setSelected,
    view,
    zoom,
    treeRevision,
    locateRequest,
    graphPane,
    explorerScroll,
    reveal,
    palette,
    displayGraph,
    positioned,
    positions,
    width,
    height,
    arrowId,
  } = useDevtoolsContext();

  const viewport = useExplorerViewport(graphPane);
  // Large graphs only mount cards near the viewport and draw edges as two paths.
  const virtual = positioned.length > VIRTUALIZE_AFTER;
  const visibleNodes = useMemo(() => {
    if (!virtual) return positioned;

    const left = viewport.left / zoom - OVERSCAN;
    const right = (viewport.left + viewport.width) / zoom + OVERSCAN;
    const top = viewport.top / zoom - OVERSCAN;
    const bottom = (viewport.top + viewport.height) / zoom + OVERSCAN;

    // The selected card always mounts so focus restore and locate can find it.
    return positioned.filter(
      ({ node, x, y }) =>
        node.id === selected ||
        (x + 228 >= left && x <= right && y + 74 >= top && y <= bottom)
    );
  }, [virtual, positioned, viewport, zoom, selected]);
  const edgePaths = useMemo(() => {
    if (!virtual) return undefined;

    const paths = { hierarchy: [] as string[], references: [] as string[] };

    for (const edge of displayGraph.edges) {
      const a = positions.get(edge.source),
        b = positions.get(edge.target);

      if (!a || !b) continue;

      paths[edge.relationship === 'references' ? 'references' : 'hierarchy'].push(
        `M${a.x + 224},${a.y + 32} C${a.x + 256},${a.y + 32} ${b.x - 32},${
          b.y + 32
        } ${b.x},${b.y + 32}`
      );
    }

    return paths;
  }, [virtual, displayGraph, positions]);

  useLayoutEffect(() => {
    const element = graphPane.current;

    if (!element) return;

    element.scrollLeft = explorerScroll.current.left;

    element.scrollTop = explorerScroll.current.top;

    return () => {
      explorerScroll.current = {
        left: element.scrollLeft,
        top: element.scrollTop,
      };
    };
  }, [graphPane, explorerScroll]);

  return (
    <>
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
        ) : (
          <>
            {/* Both views stay mounted so switching is a visibility toggle. */}
            <div data-view="tree" hidden={view !== 'tree'}>
              <InspectionTree
                key={treeRevision}
                active={view === 'tree'}
                locateRequest={locateRequest}
                onLocate={reveal}
                palette={palette}
                config={config?.tree}
                onExpandedChange={(initialExpanded) =>
                  updatePreferences({ tree: { ...config.tree, initialExpanded } })
                }
                graph={displayGraph}
                    hovered={hovered}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
            <div data-view="graph" hidden={view !== 'graph'}>
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
                  {edgePaths &&
                    (['hierarchy', 'references'] as const).map((kind) => (
                      <path
                        key={kind}
                        d={edgePaths[kind].join(' ')}
                        fill="none"
                        stroke="#64748b"
                        strokeDasharray={kind === 'references' ? '5 4' : undefined}
                        markerEnd={`url(#${arrowId})`}
                      />
                    ))}
                  {!edgePaths &&
                    displayGraph.edges.map((edge) => {
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
                  {visibleNodes.map(({ node, x, y }) => (
                    <GraphCard
                      key={node.id}
                      node={node}
                      x={x}
                      y={y}
                      selected={selected === node.id}
                      hovered={hovered === node.id}
                      palette={palette}
                      onSelect={setSelected}
                    />
                  ))}
                </g>
              </svg>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function ReactLayoutDevtoolsInspector() {
  const {
    config,
    graph,
    inspector,
    setSelected,
    palette,
    selection,
    detailsPane,
    compact,
  } = useDevtoolsContext();

  return (
    <>
      {config?.showDetails !== false && selection && (
        <aside
          ref={detailsPane}
          tabIndex={-1}
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
            borderLeft: compact ? undefined : '1px solid #334155',
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
    </>
  );
}

export function ReactLayoutDevtoolsFooter() {
  const { compact } = useDevtoolsContext();

  return (
    <>
      <footer
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          color: '#94a3b8',
          borderTop: '1px solid #334155',
        }}
      >
        {compact
          ? 'Active = mounted in React'
          : 'Resources → layouts → states → declared composables · Active means mounted in React.'}
      </footer>
    </>
  );
}

export function ReactLayoutDevtoolsWorkspace() {
  const { compact, pane, selection, config } = useDevtoolsContext();
  const details =
    compact && pane === 'inspector' && selection && config.showDetails;

  return (
    <>
      <ReactLayoutDevtoolsToolbar />

      <div
        style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <div
          hidden={Boolean(details)}
          style={{
            display: details ? 'none' : 'flex',
            flex: '3 1 0%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <ReactLayoutDevtoolsExplorer />
        </div>
        {(!compact || details) && <ReactLayoutDevtoolsInspector />}
      </div>
      <ReactLayoutDevtoolsFooter />
    </>
  );
}

/** Default composition; uses only the space supplied by its host. */
export function ReactLayoutDevtoolsContent({
  source,
  nonce,
  styleMode,
  config,
  storageKey,
  layout = 'auto',
  children,
  className,
  style,
}: ReactLayoutDevtoolsContentProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (
      layout !== 'auto' ||
      !container ||
      typeof ResizeObserver === 'undefined'
    )
      return;

    const observer = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < 760)
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [layout, container]);

  return (
    <ReactLayoutDevtoolsProvider
      source={source}
      nonce={nonce}
      styleMode={styleMode}
      config={config}
      storageKey={storageKey}
      layout={layout === 'auto' ? (narrow ? 'compact' : 'split') : layout}
    >
      <section
        ref={setContainer}
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
          minWidth: 0,
          boxSizing: 'border-box',
          font: '13px/1.5 ui-sans-serif, system-ui, sans-serif',
          ...style,
        }}
      >
        {children ?? <ReactLayoutDevtoolsWorkspace />}
      </section>
    </ReactLayoutDevtoolsProvider>
  );
}
