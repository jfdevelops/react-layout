import { EyeIcon, EyeOffIcon } from './icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GraphSnapshot } from '@jfdevelops/react-layout-devtools-core';
import { useDevtoolsContext } from './context';
import { Button } from './components/ui/button';
import { HelpTooltip } from './components/ui/tooltip';

export function OutlineToggle({
  size = 'icon',
}: { size?: 'icon' | 'icon-sm' } = {}) {
  const { config, updatePreferences } = useDevtoolsContext();
  const label = config.showOutlines
    ? 'Hide composable outlines'
    : 'Show composable outlines';
  return (
    <HelpTooltip content={label}>
      <Button
        size={size}
        aria-label={label}
        aria-pressed={config.showOutlines}
        onClick={() =>
          updatePreferences({
            showOutlines: !config.showOutlines,
            ...(!config.showOutlines
              ? {
                  initialFilters: {
                    ...config.initialFilters,
                    showComposables: true,
                  },
                }
              : {}),
          })
        }
      >
        {config.showOutlines ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </HelpTooltip>
  );
}

type Target = {
  element: HTMLElement;
  id: string;
  name: string;
  layout: string;
  depth: number;
  left: number;
  top: number;
  width: number;
  height: number;
};
function layoutName(graph: GraphSnapshot, id: string) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const queue = [id];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    if (seen.has(current)) continue;
    seen.add(current);
    const node = nodes.get(current);
    if (node?.kind === 'layout') return node.label;
    for (const edge of graph.edges)
      if (edge.target === current) queue.push(edge.source);
  }
  return 'Layout';
}

/** A single non-interactive overlay layer; only the name labels accept input. */
export function ComposableOutlines() {
  const { config, graph, palette, setSelected, hovered, setHovered } =
    useDevtoolsContext();
  const [targets, setTargets] = useState<Target[]>([]);
  const enabled = config.showOutlines && process.env.NODE_ENV !== 'production';
  useEffect(() => {
    if (!enabled) {
      setTargets([]);
      setHovered(undefined);
      return;
    }
    let frame: number | undefined;
    const observed = new Set<Element>();
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(scan);
    };
    const resize =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(schedule);
    const scan = () => {
      frame = undefined;
      const nodes = new Map(
        graph.nodes
          .filter((node) => node.kind === 'composable')
          .map((node) => [node.id, node])
      );
      const next: Target[] = [];
      const present = new Set<Element>();
      document
        .querySelectorAll<HTMLElement>('[data-rl-composable][data-rl-node]')
        .forEach((element) => {
          const id = element.dataset.rlNode!;
          const node = nodes.get(id);
          if (!node) return;
          present.add(element);
          if (!observed.has(element)) {
            resize?.observe(element);
            observed.add(element);
          }
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          let depth = 0;
          for (
            let parent = element.parentElement;
            parent;
            parent = parent.parentElement
          )
            if (parent.hasAttribute('data-rl-composable')) depth++;
          next.push({
            element,
            id,
            name: node.label,
            layout: layoutName(graph, id),
            depth,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
        });
      for (const element of observed)
        if (!present.has(element)) {
          resize?.unobserve(element);
          observed.delete(element);
        }
      setTargets((current) =>
        current.length === next.length &&
        current.every((value, i) => {
          const other = next[i]!;
          return (
            value.element === other.element &&
            value.id === other.id &&
            value.name === other.name &&
            value.layout === other.layout &&
            value.depth === other.depth &&
            value.left === other.left &&
            value.top === other.top &&
            value.width === other.width &&
            value.height === other.height
          );
        })
          ? current
          : next
      );
    };
    scan();
    const mutation = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element &&
              record.target.closest('[data-rl-outline-layer]')
            )
        )
      )
        schedule();
    });
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    // Passive listeners highlight the overlay without stealing app interactions.
    const hover = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-rl-outline-layer]')
      )
        return;
      const element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              '[data-rl-node][data-rl-composable]'
            )
          : null;
      setHovered(
        element && nodesForHover.has(element.dataset.rlNode!)
          ? element.dataset.rlNode
          : undefined
      );
    };
    const nodesForHover = new Set(graph.nodes.map((node) => node.id));
    document.addEventListener('pointerover', hover);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      mutation.disconnect();
      resize?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('pointerover', hover);
    };
  }, [enabled, graph]);
  if (!enabled || typeof document === 'undefined') return null;
  const colors = [
    palette.composable.color,
    palette.layout.color,
    palette.component.color,
    palette.resource.color,
    palette.state.color,
  ];
  return createPortal(
    <div
      data-rl-outline-layer
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99998,
      }}
    >
      {targets.map((target, index) => {
        const hash = [...target.name].reduce(
          (value, char) => value + char.charCodeAt(0),
          0
        );
        const color = colors[hash % colors.length]!;
        return (
          <div
            key={index}
            data-rl-outline={target.id}
            style={{
              position: 'absolute',
              left: target.left,
              top: target.top,
              width: target.width,
              height: target.height,
              outline: `${hovered === target.id ? 2 : 1}px solid ${color}`,
              pointerEvents: 'none',
            }}
          >
            <button
              type="button"
              aria-label={`Inspect ${target.name} in ${target.layout}`}
              onPointerEnter={() => setHovered(target.id)}
              onPointerLeave={() => setHovered(undefined)}
              onFocus={() => setHovered(target.id)}
              onBlur={() => setHovered(undefined)}
              onClick={() => setSelected(target.id)}
              style={{
                position: 'absolute',
                left: target.depth * 8,
                top: target.depth * 18,
                pointerEvents: 'auto',
                color: '#0b1220',
                background: color,
                border: 0,
                borderRadius: 3,
                font: '11px system-ui',
                cursor: 'pointer',
              }}
            >
              {target.name} · {target.layout}
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
