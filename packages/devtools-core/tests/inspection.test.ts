import { expect, it } from 'vitest';
import {
  createInspectionStore,
  getInspectionSource,
  layoutGraph,
} from '../src';
it('keeps snapshots stable until a change and composes sources without duplicate registrations', () => {
  const parent = createInspectionStore(),
    child = createInspectionStore();
  const source = child.attach({});
  parent.connect(source);
  parent.connect(source);
  expect(parent.getSnapshot()).toBe(parent.getSnapshot());
  child.node({ id: 'a', kind: 'layout', label: 'A' });
  expect(parent.getSnapshot().nodes).toHaveLength(1);
  const before = parent.getSnapshot();
  const unmount = child.mount('a');
  expect(parent.getSnapshot()).not.toBe(before);
  expect(parent.getSnapshot().nodes[0].active).toBe(1);
  unmount();
  unmount();
  expect(parent.getSnapshot().nodes[0].active).toBe(0);
  expect(getInspectionSource(source)).toBe(child);
});
it('lays out shared descendants after both parents and tolerates cyclic references', () => {
  const store = createInspectionStore();
  for (const id of ['a', 'b', 'c', 'd'])
    store.node({ id, kind: 'state', label: id });
  store.edge('a', 'b', 'contains');
  store.edge('b', 'c', 'contains');
  store.edge('a', 'd', 'defines');
  store.edge('c', 'd', 'renders');
  store.edge('d', 'a', 'references');
  const positions = new Map(
    layoutGraph(store.getSnapshot()).map((p) => [p.node.id, p])
  );
  expect(positions.get('d')!.x).toBeGreaterThan(positions.get('c')!.x);
  expect(
    new Set([...positions.values()].map((p) => `${p.x}:${p.y}`)).size
  ).toBe(4);
});
it('rejects an unsupported inspection source with an actionable error', () => {
  expect(() => getInspectionSource({})).toThrow(/layout definition or factory/);
});
it('builds a resource-owned tree and represents cycles as reference leaves', async () => {
  const { buildInspectionTree } = await import('../src');
  const store = createInspectionStore();
  for (const [id, kind] of [
    ['definition', 'definition'],
    ['resource', 'resource'],
    ['layout', 'layout'],
    ['state', 'state'],
  ] as const)
    store.node({ id, kind, label: id });
  store.edge('definition', 'resource', 'contains');
  store.edge('definition', 'layout', 'defines');
  store.edge('resource', 'layout', 'renders');
  store.edge('layout', 'state', 'defines');
  store.edge('state', 'layout', 'references');
  const tree = buildInspectionTree(store.getSnapshot());
  expect(tree).toHaveLength(1);
  expect(tree[0].children[0].children[0].node.id).toBe('layout');
  expect(
    tree[0].children[0].children[0].children[0].children[0].reference
  ).toBe(true);
});

it('honors initial activity without resetting live mounts during metadata updates', () => {
  const store = createInspectionStore();
  store.node({ id: 'existing', kind: 'layout', label: 'Existing', active: 2 });
  expect(store.getSnapshot().nodes[0].active).toBe(2);
  const unmount = store.mount('existing');
  store.node({ id: 'existing', kind: 'layout', label: 'Renamed', active: 0 });
  expect(store.getSnapshot().nodes[0].active).toBe(3);
  unmount();
  expect(store.getSnapshot().nodes[0].active).toBe(2);
});

it('routes preview commands through composed stores and resets only after the final inspector disconnects', () => {
  const parent = createInspectionStore(),
    child = createInspectionStore();
  const calls: (string | undefined)[] = [];
  parent.connect(child);
  child.registerPreview(
    {
      id: 'instance',
      layout: 'layout',
      state: 'default',
      states: ['default', 'loading'],
    },
    (state) => calls.push(state)
  );
  const first = parent.connectPreview(),
    second = parent.connectPreview();
  parent.preview('instance', 'loading');
  expect(parent.getSnapshot().instances?.[0].forcedState).toBe('loading');
  expect(() => parent.preview('instance', 'unknown')).toThrow(
    'Unknown render state'
  );
  first();
  expect(calls).toEqual(['loading']);
  second();
  expect(calls).toEqual(['loading', undefined]);
});
