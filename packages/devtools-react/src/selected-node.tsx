import { LocateIcon } from './icons';
import { NodeSource, StatePreview } from './node-debug';
import { useMemo } from 'react';
import {
  buildInspectionTree,
  type GraphNode,
  type GraphSnapshot,
  type InspectionSource,
  type InspectionTreeNode,
} from '@jfdevelops/react-layout-devtools-core';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { HelpTooltip } from './components/ui/tooltip';
import { InspectionDetails } from './inspection-details';
import { StateIcon } from './state-icon';
import { RelationshipTree } from './relationship-tree';
import type { ChipPalette } from './config';
import { loadChip } from './load-status';
import { LoadErrorDetails } from './load-error-details';

function ancestry(graph: GraphSnapshot, id: string): GraphNode[] {
  function find(
    branch: InspectionTreeNode,
    parents: GraphNode[]
  ): GraphNode[] | undefined {
    if (branch.reference) return;

    const path = [...parents, branch.node];

    if (branch.node.id === id) return path;

    for (const child of branch.children) {
      const result = find(child, path);

      if (result) return result;
    }
  }

  for (const root of buildInspectionTree(graph)) {
    const result = find(root, []);

    if (result) return result;
  }

  return graph.nodes.filter((node) => node.id === id);
}

export function SelectedNode({
  node,
  graph,
  palette,
  onSelect,
  inspector,
  highlighted = false,
  onHighlight,
}: {
  inspector?: InspectionSource;
  highlighted?: boolean;
  onHighlight?: () => void;
  node: GraphNode;
  graph: GraphSnapshot;
  palette: ChipPalette;
  onSelect: (id: string) => void;
}) {
  const path = useMemo(() => ancestry(graph, node.id), [graph, node.id]);
  const related = graph.edges.filter(
    (edge) => edge.source === node.id || edge.target === node.id
  );
  const status = node.active > 0 ? palette.active : palette.inactive;
  const loadStatus = loadChip(node);

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <nav aria-label="Selected node path">
        <ol
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {path.map((part, index) => (
            <li
              key={part.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
              }}
            >
              {index > 0 && (
                <span aria-hidden="true" style={{ color: '#64748b' }}>
                  ›
                </span>
              )}
              <Button
                aria-current={part.id === node.id ? 'page' : undefined}
                onClick={() => onSelect(part.id)}
                style={{
                  background: 'transparent',
                  border: 0,
                  borderRadius: 4,
                  padding: '2px 4px',
                  fontSize: 11,
                  color: part.id === node.id ? '#e2e8f0' : '#94a3b8',
                  overflowWrap: 'anywhere',
                  textAlign: 'left',
                }}
              >
                {part.kind === 'resource'
                  ? part.label.split('.').at(-1)
                  : part.label}
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {node.kind === 'state' && (
              <StateIcon
                state={node.label}
                palette={palette}
                size={14}
                spinning={node.active > 0}
              />
            )}
            {node.label}
          </h3>
          <HelpTooltip
            content={
              highlighted ? 'Stop highlighting on page' : 'Highlight on page'
            }
          >
            <Button
              size="icon"
              aria-label={`Highlight ${node.label} on page`}
              aria-pressed={highlighted}
              disabled={!onHighlight}
              onClick={onHighlight}
            >
              <LocateIcon />
            </Button>
          </HelpTooltip>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <Badge style={palette[node.kind]}>{node.kind}</Badge>
          <HelpTooltip
            content={`${node.active} mounted instance${
              node.active === 1 ? '' : 's'
            }. Activity reflects current React mounts.`}
          >
            <Badge
              tabIndex={0}
              aria-label={`${node.active} mounted instance${
                node.active === 1 ? '' : 's'
              }`}
              style={{ ...status, gap: 6 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: status.color,
                  flexShrink: 0,
                }}
              />
              {node.active} mounted
            </Badge>
          </HelpTooltip>
          {loadStatus && (
            <HelpTooltip content={loadStatus.help}>
              <Badge tabIndex={0} style={palette[loadStatus.kind]}>
                {loadStatus.kind === 'unresolved'
                  ? 'Not loaded'
                  : loadStatus.kind === 'loading'
                    ? 'Loading'
                    : 'Failed to load'}
              </Badge>
            </HelpTooltip>
          )}
        </div>
      </header>
      {node.status === 'error' && node.error && (
        <LoadErrorDetails error={node.error} palette={palette} />
      )}
      <NodeSource node={node} />
      <StatePreview
        layout={path.find((part) => part.kind === 'layout')?.id}
        state={node.kind === 'state' ? node.id : undefined}
        graph={graph}
        inspector={inspector}
        palette={palette}
      />
      <InspectionDetails
        key={node.id}
        details={node.details ?? {}}
        palette={palette}
      />
      <section
        aria-label="Relationships"
        style={{ borderTop: '1px solid #243044', paddingTop: 16 }}
      >
        <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>
          Relationships{' '}
          <span style={{ color: '#94a3b8', fontWeight: 400 }}>
            {related.length}
          </span>
        </h4>
        <RelationshipTree
          key={node.id}
          node={node}
          graph={graph}
          palette={palette}
          onSelect={onSelect}
        />
      </section>
    </article>
  );
}
