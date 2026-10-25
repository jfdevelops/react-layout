import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RelationshipTree } from '../src/relationship-tree';
import { resolveChipColors } from '../src/config';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';

it('groups incoming and outgoing relationships into collapsible, clickable branches', () => {
  const store = createInspectionStore();
  store.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });
  store.node({ id: 'parent', kind: 'definition', label: 'Definition' });
  store.node({ id: 'state', kind: 'state', label: 'Loading' });
  store.edge('parent', 'layout', 'defines');
  store.edge('layout', 'state', 'defines');
  const graph = store.getSnapshot();
  const onSelect = vi.fn();
  render(
    <RelationshipTree
      node={graph.nodes[0]}
      graph={graph}
      palette={resolveChipColors(undefined)}
      onSelect={onSelect}
    />
  );
  const tree = within(screen.getByRole('tree', { name: 'Node relationships' }));
  const branch = tree.getByRole('treeitem', { name: 'Defines' });
  expect(
    tree.getByRole('treeitem', { name: 'Defined by' })
  ).toBeTruthy();
  fireEvent.click(branch);
  expect(branch.getAttribute('aria-expanded')).toBe('false');
  expect(tree.queryByRole('treeitem', { name: 'defines: Loading' })).toBeNull();
  fireEvent.keyDown(branch, { key: 'ArrowRight' });
  const leaf = tree.getByRole('treeitem', { name: 'defines: Loading' });
  fireEvent.click(leaf);
  expect(onSelect).toHaveBeenCalledWith('state');
  fireEvent.keyDown(leaf, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(branch);
  fireEvent.keyDown(branch, { key: 'End' });
  expect(document.activeElement).toBe(leaf);
  fireEvent.click(tree.getByRole('treeitem', { name: 'defines: Definition' }));
  expect(onSelect).toHaveBeenCalledWith('parent');
});
