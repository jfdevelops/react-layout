import type { GraphNode } from '@jfdevelops/react-layout-devtools-core';

type LoadChip = {
  kind: 'unresolved' | 'loading' | 'error';
  label: string;
  help: string;
};

/** Chip shown for a node that is not loaded yet, is loading, or failed. */
export function loadChip(node: GraphNode): LoadChip | undefined {
  if (node.status === 'error')
    return {
      kind: 'error',
      label: 'error',
      help: 'This node failed to load. Select it to see the error.',
    };

  if (node.status === 'loading')
    return {
      kind: 'loading',
      label: 'loading',
      help: 'This node is importing its implementation.',
    };

  if (node.unresolved)
    return {
      kind: 'unresolved',
      label: 'unresolved',
      help: 'This node is declared, but its implementation has not loaded yet.',
    };
}
