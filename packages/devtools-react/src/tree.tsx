import { Button } from './components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInspectionTree,
  type GraphSnapshot,
  type InspectionTreeNode,
} from '@jfdevelops/react-layout-devtools-core';
import type { ChipPalette, ReactLayoutDevtoolsConfig } from './config';
import { loadChip } from './load-status';
import { StateIcon } from './state-icon';

const ROW_HEIGHT = 26;
const VIRTUALIZE_AFTER = 200;
const OVERSCAN_ROWS = 4;

export function InspectionTree({
  graph,
  active = true,
  locateRequest = 0,
  onLocate,
  palette,
  config,
  selected,
  hovered,
  onSelect,
  onExpandedChange,
}: {
  graph: GraphSnapshot;
  /** False while the tree is mounted but hidden behind another view. */
  active?: boolean;
  locateRequest?: number;
  onLocate?: (element: HTMLElement) => void;
  palette: ChipPalette;
  config?: ReactLayoutDevtoolsConfig['tree'];
  selected?: string;
  hovered?: string;
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
    if (
      !active ||
      !locateRequest ||
      !selected ||
      handledRequest.current === locateRequest
    )
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
  }, [active, locateRequest, selected, roots]);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const isExpanded = (id: string) =>
    !collapsed.has(id) && (allExpanded || expanded.has(id));

  // Visible rows in document order, used to window large trees.
  const flattened = useMemo(() => {
    const rows: { entry: InspectionTreeNode; key: string; depth: number }[] =
      [];

    function visit(
      entries: readonly InspectionTreeNode[],
      prefix: string,
      depth: number
    ) {
      entries.forEach((entry, index) => {
        const key = prefix ? `${prefix}/${index}` : String(index);

        rows.push({ entry, key, depth });

        if (
          !collapsed.has(entry.node.id) &&
          (allExpanded || expanded.has(entry.node.id))
        )
          visit(entry.children, key, depth + 1);
      });
    }

    visit(roots, '', 0);

    return rows;
  }, [roots, collapsed, expanded, allExpanded]);
  const virtual = flattened.length > VIRTUALIZE_AFTER;
  const start = virtual
    ? Math.max(
        0,
        Math.min(
          flattened.length - 1,
          Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS
        )
      )
    : 0;
  const end = virtual
    ? Math.min(
        flattened.length,
        start + Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2
      )
    : flattened.length;

  useEffect(() => {
    if (!virtual) return;

    const pane = tree.current?.closest<HTMLElement>('[role="region"]');

    if (!pane) return;

    const update = () => {
      setScrollTop(pane.scrollTop);

      setViewportHeight(pane.clientHeight || 600);
    };

    update();

    pane.addEventListener('scroll', update, { passive: true });

    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(update);

    observer?.observe(pane);

    return () => {
      pane.removeEventListener('scroll', update);

      observer?.disconnect();
    };
  }, [virtual]);

  useEffect(() => {
    if (!revealing) return;

    const element = tree.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]'
    );

    if (element) {
      onLocate?.(element);

      setRevealing(false);

      return;
    }

    const index = flattened.findIndex((row) => row.entry.node.id === selected);

    // A windowed row may not be mounted yet: move the window, then retry.
    if (virtual && index >= 0 && (index < start || index >= end)) {
      setScrollTop(index * ROW_HEIGHT);

      return;
    }

    setRevealing(false);
  }, [revealing, onLocate, flattened, selected, virtual, start, end]);

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
    const status = loadChip(node);

    return (
      <li
        role="none"
        key={key}
        style={
          virtual
            ? { marginLeft: depth * 14, height: ROW_HEIGHT }
            : undefined
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 26,
            boxSizing: 'border-box',
            ...(!virtual && hasChildren && expanded && config?.stickyScopes !== false
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
            aria-level={virtual ? depth + 1 : undefined}
            data-tree-node
            data-hovered-node={hovered === node.id}
            aria-label={`${node.kind} ${node.label}${
              node.active ? ` active (${node.active})` : ''
            }${status ? ` ${status.label}` : ''}`}
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
              background: selected === node.id || hovered === node.id ? '#253247' : 'transparent',
              font: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {node.kind === 'state' && (
              <StateIcon
                state={node.label}
                palette={palette}
                spinning={node.active > 0}
              />
            )}
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
            {status && (
              <span
                title={
                  status.kind === 'error' && node.error
                    ? `${node.error.name}: ${node.error.message}`
                    : status.help
                }
                style={{
                  font: '10px/18px ui-sans-serif, system-ui, sans-serif',
                  padding: '0 6px',
                  borderRadius: 4,
                  color: palette[status.kind].color,
                  background: palette[status.kind].background,
                }}
              >
                {status.label}
              </span>
            )}
          </Button>
        </div>
        {!virtual && hasChildren && expanded && (
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
        style={{
          padding: virtual
            ? `${start * ROW_HEIGHT}px 0 ${
                (flattened.length - end) * ROW_HEIGHT
              }px 10px`
            : '0 0 0 10px',
          margin: 0,
          listStyle: 'none',
        }}
      >
        {virtual
          ? flattened
              .slice(start, end)
              .map(({ entry, key, depth }) => row(entry, key, depth))
          : roots.map((entry, index) => row(entry, String(index)))}
      </ul>
      <div aria-hidden="true" style={{ color: '#64748b' }}>
        {'}'}
      </div>
    </div>
  );
}
