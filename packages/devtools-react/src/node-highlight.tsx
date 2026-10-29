import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GraphSnapshot } from '@jfdevelops/react-layout-devtools-core';

type Box = {
  element: Element;
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Follow owned descendants, never unrelated nodes linked as references. */
export function highlightNodeIds(
  graph: GraphSnapshot,
  id: string
): Set<string> {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.relationship === 'references') continue;
    const children = outgoing.get(edge.source) ?? [];
    children.push(edge.target);
    outgoing.set(edge.source, children);
  }
  const ids = new Set([id]);
  const queue = [id];
  for (let i = 0; i < queue.length; i++) {
    for (const child of outgoing.get(queue[i]!) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      queue.push(child);
    }
  }
  return ids;
}

/** Highlight actual mounted roots without mutating app styles or intercepting input. */
export function NodeHighlight({
  graph,
  id,
  color,
}: {
  graph: GraphSnapshot;
  id?: string;
  color: string;
}) {
  const [measurement, setMeasurement] = useState<{
    id: string;
    boxes: Box[];
  }>();
  const enabled = process.env.NODE_ENV !== 'production' && id !== undefined;
  useEffect(() => {
    if (!enabled || !id) return;
    const ids = highlightNodeIds(graph, id);
    let frame: number | undefined;
    const observed = new Set<Element>();
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(scan);
    };
    const resize =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(schedule);
    function scan() {
      frame = undefined;
      const exact: Element[] = [];
      const descendants: Element[] = [];
      document
        .querySelectorAll<HTMLElement>('[data-rl-node], [data-rl-owners]')
        .forEach((element) => {
          let owners: string[] = [];
          try {
            const parsed: unknown = JSON.parse(
              element.dataset.rlOwners ?? '[]'
            );
            if (Array.isArray(parsed))
              owners = parsed.filter(
                (owner): owner is string => typeof owner === 'string'
              );
          } catch {}
          const node = element.dataset.rlNode;
          if (node === id || owners.includes(id!)) exact.push(element);
          else if (
            (node && ids.has(node)) ||
            owners.some((owner) => ids.has(owner))
          )
            descendants.push(element);
        });
      const matches = exact.length ? exact : descendants;
      const matched = new Set(matches);
      const roots = matches.filter((element) => {
        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        )
          if (matched.has(parent)) return false;
        return true;
      });
      const present = new Set<Element>();
      const measure = (element: Element): Box[] => {
        present.add(element);
        if (!observed.has(element)) {
          resize?.observe(element);
          observed.add(element);
        }
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height)
          return [
            {
              element,
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
          ];
        // display:contents roots have no box; their visible children still do.
        return Array.from(element.children).flatMap(measure);
      };
      const boxes = roots.flatMap(measure);
      for (const element of observed) {
        if (!present.has(element)) {
          resize?.unobserve(element);
          observed.delete(element);
        }
      }
      setMeasurement((previous) =>
        previous &&
        previous.id === id &&
        previous.boxes.length === boxes.length &&
        previous.boxes.every((box, index) => {
          const next = boxes[index]!;
          return (
            box.element === next.element &&
            box.left === next.left &&
            box.top === next.top &&
            box.width === next.width &&
            box.height === next.height
          );
        })
          ? previous
          : { id: id!, boxes }
      );
    }
    scan();
    const mutation = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element &&
              record.target.closest(
                '[data-rl-highlight-layer], [data-rl-outline-layer]'
              )
            )
        )
      )
        schedule();
    });
    mutation.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-rl-node',
        'data-rl-owners',
        'class',
        'style',
        'hidden',
      ],
    });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [enabled, graph, id]);
  if (!enabled || measurement?.id !== id || typeof document === 'undefined')
    return null;
  const name = graph.nodes.find((node) => node.id === id)?.label;
  return createPortal(
    <div
      data-rl-highlight-layer={id}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99998,
      }}
    >
      {measurement.boxes.map((box, index) => (
        <div
          key={index}
          data-rl-highlight={id}
          style={{
            position: 'absolute',
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            boxSizing: 'border-box',
            outline: `2px solid ${color}`,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              background: color,
              color: '#0b1220',
              font: '12px system-ui',
              padding: '2px 6px',
              borderRadius: 3,
            }}
          >
            {name}
          </span>
        </div>
      ))}
    </div>,
    document.body
  );
}
