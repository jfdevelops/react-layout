import { ChevronDownIcon, ChevronRightIcon } from './icons';
import { useId, useState } from 'react';
import type {
  GraphEdge,
  GraphNode,
  GraphSnapshot,
} from '@jfdevelops/react-layout-devtools-core';
import type { ChipPalette } from './config';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';

const incomingLabels = {
  contains: 'Contained by',
  defines: 'Defined by',
  renders: 'Rendered by',
  declares: 'Declared by',
  references: 'Referenced by',
};
function Branch({
  label,
  edges,
  node,
  graph,
  palette,
  onSelect,
}: {
  label: string;
  edges: readonly GraphEdge[];
  node: GraphNode;
  graph: GraphSnapshot;
  palette: ChipPalette;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const groupId = useId();
  return (
    <li role="none">
      <Button
        role="treeitem"
        aria-expanded={expanded}
        aria-owns={expanded ? groupId : undefined}
        aria-label={label}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            setExpanded(true);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setExpanded(false);
          }
        }}
        style={{
          padding: '6px 0',
          border: 0,
          background: 'transparent',
          color: '#94a3b8',
          fontSize: 11,
          gap: 6,
        }}
      >
        <span aria-hidden="true" style={{ width: 12 }}>
          {expanded ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
        </span>
        {label}
        <span style={{ color: '#64748b' }}>{edges.length}</span>
      </Button>
      {expanded && (
        <ul
          id={groupId}
          role="group"
          aria-label={label}
          style={{ listStyle: 'none', padding: '0 0 4px 18px', margin: 0 }}
        >
          {edges.map((edge) => {
            const other = graph.nodes.find(
              (candidate) =>
                candidate.id ===
                (edge.source === node.id ? edge.target : edge.source)
            );
            if (!other) return null;
            return (
              <li role="none" key={edge.id}>
                <Button
                  role="treeitem"
                  aria-label={`${edge.relationship}: ${other.label}`}
                  onClick={() => onSelect(other.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      const parent =
                        event.currentTarget.closest(
                          '[role="group"]'
                        )?.previousElementSibling;
                      if (parent instanceof HTMLElement) parent.focus();
                    }
                  }}
                  style={{
                    padding: '5px 6px',
                    border: 0,
                    background: 'transparent',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    flexWrap: 'wrap',
                    fontSize: 12,
                    gap: 6,
                    maxWidth: '100%',
                  }}
                >
                  <span style={{ overflowWrap: 'anywhere' }}>
                    {other.label}
                  </span>
                  <Badge style={palette[other.kind]}>{other.kind}</Badge>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
/** Group every direct relationship by its direction and kind, in both main views. */
export function RelationshipTree({
  node,
  graph,
  palette,
  onSelect,
}: {
  node: GraphNode;
  graph: GraphSnapshot;
  palette: ChipPalette;
  onSelect: (id: string) => void;
}) {
  const related = graph.edges.filter(
    (edge) => edge.source === node.id || edge.target === node.id
  );
  const groups = new Map<string, GraphEdge[]>();
  for (const edge of related) {
    const label =
      edge.source === node.id
        ? edge.relationship[0].toUpperCase() + edge.relationship.slice(1)
        : incomingLabels[edge.relationship];
    groups.set(label, [...(groups.get(label) ?? []), edge]);
  }
  return related.length ? (
    <ul
      role="tree"
      aria-label="Node relationships"
      onKeyDown={(event) => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        const rows = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="treeitem"]'
          )
        );
        const index = rows.indexOf(event.target as HTMLButtonElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? rows.length - 1
              : Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    index + (event.key === 'ArrowDown' ? 1 : -1)
                  )
                );
        rows[next]?.focus();
      }}
      style={{ padding: 0, margin: 0, listStyle: 'none' }}
    >
      {[...groups].map(([label, edges]) => (
        <Branch
          key={label}
          label={label}
          edges={edges}
          node={node}
          graph={graph}
          palette={palette}
          onSelect={onSelect}
        />
      ))}
    </ul>
  ) : (
    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
      No relationships declared.
    </p>
  );
}
