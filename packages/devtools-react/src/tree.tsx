import { Button } from './components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInspectionTree,
  type GraphSnapshot,
  type InspectionTreeNode,
} from '@jfdevelops/react-layout-devtools-core';
import type { ChipPalette, ReactLayoutDevtoolsConfig } from './config';

export function InspectionTree({
  graph,
  locateRequest = 0,
  onLocate,
  palette,
  config,
  selected,
  onSelect,
  onExpandedChange,
}: {
  graph: GraphSnapshot;
  locateRequest?: number;
  onLocate?: (element: HTMLElement) => void;
  palette: ChipPalette;
  config?: ReactLayoutDevtoolsConfig['tree'];
  selected?: string;
  onSelect: (id: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const roots = useMemo(() => buildInspectionTree(graph), [graph]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(
    config?.initialExpanded ?? true
  );

  useEffect(() => {
    setAllExpanded(config?.initialExpanded ?? true);

    setCollapsed(new Set());

    setExpanded(new Set());
  }, [config?.initialExpanded]);

  const tree = useRef<HTMLUListElement>(null);
  const handledRequest = useRef(0);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!locateRequest || !selected || handledRequest.current === locateRequest)
      return;

    handledRequest.current = locateRequest;

    function path(
      entries: readonly InspectionTreeNode[],
      parents: string[]
    ): string[] | undefined {
      for (const entry of entries) {
        if (entry.node.id === selected) return parents;

        const found = path(entry.children, [...parents, entry.node.id]);

        if (found) return found;
      }
    }

    const ancestors = path(roots, []);

    if (!ancestors) return;

    setExpanded((current) => new Set([...current, ...ancestors]));

    setCollapsed(
      (current) => new Set([...current].filter((id) => !ancestors.includes(id)))
    );

    setRevealing(true);
  }, [locateRequest, selected, roots]);

  useEffect(() => {
    if (!revealing) return;

    const element = tree.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]'
    );

    if (element) onLocate?.(element);

    setRevealing(false);
  }, [revealing, onLocate]);

  const isExpanded = (id: string) =>
    !collapsed.has(id) && (allExpanded || expanded.has(id));

  function open(id: string) {
    setExpanded((current) => new Set([...current, id]));

    setCollapsed((current) => {
      const next = new Set(current);

      next.delete(id);

      return next;
    });
  }

  function close(id: string) {
    setCollapsed((current) => new Set([...current, id]));
  }

  function toggle(id: string) {
    isExpanded(id) ? close(id) : open(id);
  }

  function row(entry: InspectionTreeNode, key: string, depth = 0) {
    const expanded = isExpanded(entry.node.id);
    const hasChildren = entry.children.length > 0;
    const node = entry.node;
    const label =
      node.kind === 'resource'
        ? node.label.split('.').at(-1) ?? node.label
        : node.label;

    return (
      <li role="none" key={key}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 26,
            boxSizing: 'border-box',
            ...(hasChildren && expanded && config?.stickyScopes !== false
              ? {
                  position: 'sticky' as const,
                  top: depth * 26,
                  zIndex: 100 - depth,
                  background: '#0b1220',
                }
              : {}),
          }}
        >
          {hasChildren ? (
            <Button
              type="button"
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.label}`}
              onClick={() => toggle(node.id)}
              style={{
                color: '#64748b',
                padding: 0,
                font: 'inherit',
                border: 0,
                background: 'transparent',
                width: 18,
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {expanded ? '▾' : '▸'}
            </Button>
          ) : (
            <span aria-hidden="true" style={{ width: 18, flexShrink: 0 }} />
          )}
          <Button
            type="button"
            role="treeitem"
            data-tree-node
            aria-label={`${node.kind} ${node.label}${
              node.active ? ` active (${node.active})` : ''
            }${node.unresolved ? ' unresolved' : ''}`}
            aria-selected={selected === node.id}
            aria-expanded={hasChildren ? expanded : undefined}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' && hasChildren) {
                event.preventDefault();

                open(node.id);
              }

              if (event.key === 'ArrowLeft' && hasChildren) {
                event.preventDefault();

                close(node.id);
              }

              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();

                const rows = Array.from(
                  event.currentTarget
                    .closest('[role="tree"]')!
                    .querySelectorAll<HTMLButtonElement>('[data-tree-node]')
                );
                const index = rows.indexOf(event.currentTarget);

                rows[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
              }
            }}
            style={{
              display: 'inline-flex',
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              gap: 6,
              alignItems: 'center',
              border: 0,
              borderRadius: 4,
              padding: '2px 4px',
              color: '#cbd5e1',
              background: selected === node.id ? '#253247' : 'transparent',
              font: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>
              {JSON.stringify(label)}
              <span style={{ color: '#64748b' }}>:</span>
            </span>
            {hasChildren && (
              <span style={{ color: '#64748b' }}>
                {expanded ? '{' : '{ … }'}
              </span>
            )}
            <span
              style={{
                font: '10px/18px ui-sans-serif, system-ui, sans-serif',
                padding: '0 6px',
                borderRadius: 4,
                color: palette[entry.reference ? 'reference' : node.kind].color,
                background:
                  palette[entry.reference ? 'reference' : node.kind].background,
              }}
            >
              {entry.reference ? '↗ reference' : node.kind}
            </span>
            {node.active > 0 && (
              <span
                style={{
                  font: '10px/18px ui-sans-serif, system-ui, sans-serif',
                  padding: '0 6px',
                  borderRadius: 4,
                  color: palette.active.color,
                  background: palette.active.background,
                }}
              >
                active{node.active > 1 ? ` ×${node.active}` : ''}
              </span>
            )}
            {node.unresolved && (
              <span
                style={{
                  font: '10px/18px ui-sans-serif, system-ui, sans-serif',
                  padding: '0 6px',
                  borderRadius: 4,
                  color: palette.unresolved.color,
                  background: palette.unresolved.background,
                }}
              >
                unresolved
              </span>
            )}
          </Button>
        </div>
        {hasChildren && expanded && (
          <>
            <ul
              role="group"
              style={{
                margin: 0,
                paddingLeft: 20,
                listStyle: 'none',
              }}
            >
              {entry.children.map((child, index) =>
                row(child, `${key}/${index}`, depth + 1)
              )}
            </ul>
            <div
              aria-hidden="true"
              style={{ paddingLeft: 22, color: '#64748b', lineHeight: '26px' }}
            >
              {'},'}
            </div>
          </>
        )}
      </li>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        font: '12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <Button
          type="button"
          style={{
            border: 0,
            background: 'transparent',
            color: '#94a3b8',
            font: '11px ui-sans-serif, system-ui, sans-serif',
            padding: 0,
            cursor: 'pointer',
          }}
          onClick={() => {
            setAllExpanded(true);

            onExpandedChange?.(true);

            setCollapsed(new Set());
          }}
        >
          Expand all
        </Button>
        <Button
          type="button"
          style={{
            border: 0,
            background: 'transparent',
            color: '#94a3b8',
            font: '11px ui-sans-serif, system-ui, sans-serif',
            padding: 0,
            cursor: 'pointer',
          }}
          onClick={() => {
            setAllExpanded(false);

            onExpandedChange?.(false);

            setExpanded(new Set());

            setCollapsed(new Set());
          }}
        >
          Collapse all
        </Button>
      </div>
      <div aria-hidden="true" style={{ color: '#64748b' }}>
        {'{'}
      </div>
      <ul
        ref={tree}
        role="tree"
        aria-label="Layout hierarchy"
        style={{ padding: '0 0 0 10px', margin: 0, listStyle: 'none' }}
      >
        {roots.map((entry, index) => row(entry, String(index)))}
      </ul>
      <div aria-hidden="true" style={{ color: '#64748b' }}>
        {'}'}
      </div>
    </div>
  );
}
