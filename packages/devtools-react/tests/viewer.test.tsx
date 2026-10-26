import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent, ReactLayoutDevtools } from '../src';

it('renders live activity and lets users inspect related nodes', () => {
  const store = createInspectionStore();

  store.node({
    id: 'layout',
    kind: 'layout',
    label: 'UsersLayout',
    details: { resource: 'users' },
  });

  store.node({ id: 'loading', kind: 'state', label: 'Loading' });

  store.edge('layout', 'loading', 'defines');

  render(<ReactLayoutDevtoolsContent source={store.attach({})} />);

  expect(screen.getByText('0 active states', { exact: false })).toBeTruthy();

  let unmount: () => void;

  act(() => {
    unmount = store.mount('layout', 'loading');
  });

  expect(screen.getByText('1 active states', { exact: false })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersLayout/i }));

  expect(screen.getByRole('heading', { name: 'UsersLayout' })).toBeTruthy();

  fireEvent.click(screen.getByRole('treeitem', { name: 'defines: Loading' }));

  expect(screen.getByRole('heading', { name: 'Loading' })).toBeTruthy();

  act(() => unmount!());

  expect(screen.getByLabelText('0 mounted instances')).toBeTruthy();
});

it('opens from its floating button and closes with Escape', () => {
  vi.useFakeTimers();

  const source = createInspectionStore();

  render(<ReactLayoutDevtools source={source} />);

  const trigger = screen.getByRole('button', {
    name: 'Open React Layout Devtools',
  });

  expect(screen.queryByRole('dialog')).toBeNull();

  fireEvent.click(trigger);

  const dialog = screen.getByRole('dialog', { name: 'React Layout Devtools' });

  expect(dialog).toBeTruthy();

  expect(
    screen.queryByRole('button', { name: 'Open React Layout Devtools' })
  ).toBeNull();

  act(() => vi.advanceTimersByTime(300));

  fireEvent.keyDown(dialog, { key: 'Escape' });

  act(() => vi.advanceTimersByTime(300));

  expect(screen.queryByRole('dialog')).toBeNull();

  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Open React Layout Devtools' })
  );

  vi.useRealTimers();
});

it('switches to a live tree and supports expanding and collapsing branches', () => {
  const source = createInspectionStore();

  source.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });

  source.node({ id: 'state', kind: 'state', label: 'Loading' });

  source.edge('layout', 'state', 'defines');

  render(<ReactLayoutDevtoolsContent source={source} />);

  fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));

  expect(screen.getByRole('tree', { name: 'Layout hierarchy' })).toBeTruthy();

  expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();

  expect(screen.getByRole('treeitem', { name: /Loading/ })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

  expect(screen.queryByRole('treeitem', { name: /Loading/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));

  act(() => {
    source.mount('state');
  });

  expect(screen.getByRole('treeitem', { name: /Loading active/ })).toBeTruthy();
});

it('labels icon view tabs and shows tooltips on hover and focus', async () => {
  render(<ReactLayoutDevtoolsContent source={createInspectionStore()} />);

  const graph = screen.getByRole('tab', { name: 'Graph' });
  const tree = screen.getByRole('tab', { name: 'Tree' });

  fireEvent.pointerMove(graph, { pointerType: 'mouse' });

  expect((await screen.findByRole('tooltip')).textContent).toBe('Graph view');

  fireEvent.keyDown(graph, { key: 'Escape' });

  expect(screen.queryByRole('tooltip')).toBeNull();

  fireEvent.focus(tree);

  expect((await screen.findByRole('tooltip')).textContent).toBe('Tree view');

  fireEvent.click(tree);

  expect(tree.getAttribute('aria-selected')).toBe('true');
});

it('applies partial chip colors and initial display preferences', () => {
  const source = createInspectionStore();

  source.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });

  source.node({ id: 'state', kind: 'state', label: 'Loading' });

  source.edge('layout', 'state', 'defines');

  source.mount('layout');

  const view = render(
    <ReactLayoutDevtoolsContent
      source={source}
      config={{
        initialView: 'tree',
        initialFilters: { activeOnly: true },
        showDetails: false,
        chipColors: {
          layout: 'red',
          active: { color: 'yellow', background: 'navy' },
        },
        tree: { stickyScopes: false, initialExpanded: false },
      }}
    />
  );

  expect(
    screen.getByRole('tab', { name: 'Tree' }).getAttribute('aria-selected')
  ).toBe('true');

  expect(screen.getByRole('checkbox', { name: 'Active only' })).toBeChecked();

  expect(screen.queryByLabelText('Node details')).toBeNull();

  expect(screen.getByText('layout', { exact: true })).toHaveStyle({
    color: 'rgb(255, 0, 0)',
  });

  expect(screen.getByText('active', { exact: true })).toHaveStyle({
    color: 'rgb(255, 255, 0)',
    background: 'rgb(0, 0, 128)',
  });

  view.rerender(
    <ReactLayoutDevtoolsContent
      source={source}
      config={{ chipColors: { layout: 'blue' } }}
    />
  );

  expect(screen.getByText('layout', { exact: true })).toHaveStyle({
    color: 'rgb(255, 0, 0)',
  });

  expect(
    screen.getByRole('tab', { name: 'Tree' }).getAttribute('aria-selected')
  ).toBe('true');
});

it('starts collapsed trees predictably, including newly registered children', () => {
  const source = createInspectionStore();

  source.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });

  source.node({ id: 'state', kind: 'state', label: 'Loading' });

  source.edge('layout', 'state', 'defines');

  render(
    <ReactLayoutDevtoolsContent
      source={source}
      config={{ initialView: 'tree', tree: { initialExpanded: false } }}
    />
  );

  expect(screen.queryByRole('treeitem', { name: /Loading/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Expand UsersLayout' }));

  expect(screen.getByRole('treeitem', { name: /Loading/ })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

  act(() => {
    source.node({ id: 'new', kind: 'state', label: 'Preview' });

    source.edge('layout', 'new', 'defines');
  });

  expect(screen.queryByRole('treeitem', { name: /Preview/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));

  expect(screen.getByRole('treeitem', { name: /Preview/ })).toBeTruthy();
});

it('forwards config through the floating component', () => {
  render(
    <ReactLayoutDevtools
      source={createInspectionStore()}
      config={{ initialView: 'tree', showDetails: false }}
      initialIsOpen
    />
  );

  expect(
    screen.getByRole('tab', { name: 'Tree' }).getAttribute('aria-selected')
  ).toBe('true');

  expect(screen.queryByLabelText('Node details')).toBeNull();
});

it('dismisses a tooltip with Escape before closing the floating panel', async () => {
  render(
    <ReactLayoutDevtools source={createInspectionStore()} initialIsOpen />
  );

  const graph = screen.getByRole('tab', { name: 'Graph' });

  fireEvent.focus(graph);

  expect((await screen.findByRole('tooltip')).textContent).toBe('Graph view');

  fireEvent.keyDown(graph, { key: 'Escape' });

  expect(screen.queryByRole('tooltip')).toBeNull();

  expect(
    screen.getByRole('dialog', { name: 'React Layout Devtools' })
  ).toBeTruthy();

  fireEvent.keyDown(graph, { key: 'Escape' });

  expect(screen.getByRole('dialog').style.animation).toContain('exit');
});

it('shows the sliding details pane only after selection and hides it when the selected node disappears', () => {
  const source = createInspectionStore();

  source.node({ id: 'users', kind: 'layout', label: 'UsersLayout' });

  const view = render(<ReactLayoutDevtoolsContent source={source} />);

  expect(screen.queryByLabelText('Node details')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersLayout/i }));

  const pane = screen.getByLabelText('Node details');

  expect(pane.style.animation).toContain('react-layout-details-enter');

  expect(screen.getByRole('heading', { name: 'UsersLayout' })).toBeTruthy();

  view.rerender(
    <ReactLayoutDevtoolsContent source={createInspectionStore()} />
  );

  expect(screen.queryByLabelText('Node details')).toBeNull();
});

it('locates a filtered selection and reveals collapsed tree ancestors', () => {
  const source = createInspectionStore();

  source.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });

  source.node({ id: 'state', kind: 'state', label: 'Loading' });

  source.edge('layout', 'state', 'defines');

  const scroll = vi.fn();
  const original = HTMLElement.prototype.scrollTo;

  HTMLElement.prototype.scrollTo = scroll;

  try {
    render(<ReactLayoutDevtoolsContent source={source} />);

    const locate = screen.getByRole('button', { name: 'Locate selection' });

    expect(locate).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /STATE.*Loading/i }));

    fireEvent.click(locate);

    expect(scroll).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

    fireEvent.change(screen.getByLabelText('Search graph'), {
      target: { value: 'missing' },
    });

    scroll.mockClear();

    fireEvent.click(locate);

    expect(screen.getByLabelText('Search graph')).toHaveValue('');

    const target = screen.getByRole('treeitem', { name: 'state Loading' });

    expect(target).toHaveFocus();

    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    HTMLElement.prototype.scrollTo = original;
  }
});
