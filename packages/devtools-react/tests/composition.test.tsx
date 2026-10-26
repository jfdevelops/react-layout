import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import {
  ReactLayoutDevtoolsContent,
  ReactLayoutDevtoolsProvider,
  ReactLayoutDevtoolsToolbar,
  ReactLayoutDevtoolsExplorer,
  ReactLayoutDevtoolsInspector,
  ReactLayoutDevtools,
} from '../src';

function source() {
  const store = createInspectionStore();

  store.node({ id: 'layout', kind: 'layout', label: 'UsersPage' });

  return store;
}

it('switches between explorer and details instead of squeezing panes in compact content', () => {
  render(<ReactLayoutDevtoolsContent source={source()} layout="compact" />);

  expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();

  expect(screen.queryByRole('button', { name: 'Back to explorer' })).toBeNull();

  const node = screen.getByRole('button', { name: /LAYOUT.*UsersPage/i });

  node.focus();

  fireEvent.click(node);

  expect(screen.getByLabelText('Node details')).toHaveFocus();

  expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();

  expect(
    screen.getByLabelText('Scrollable relationship graph')
  ).not.toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Back to explorer' }));

  expect(screen.getByLabelText('Scrollable relationship graph')).toBeTruthy();

  expect(
    screen.getByRole('button', { name: /LAYOUT.*UsersPage/i })
  ).toHaveFocus();

  expect(screen.queryByLabelText('Node details')).toBeNull();

  expect(screen.queryByRole('button', { name: 'Back to explorer' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersPage/i }));

  expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();
});

it('shares selection across separately composed controls and panes', () => {
  render(
    <ReactLayoutDevtoolsProvider source={source()}>
      <ReactLayoutDevtoolsToolbar />
      <div style={{ display: 'flex', height: 300 }}>
        <ReactLayoutDevtoolsExplorer />
        <ReactLayoutDevtoolsInspector />
      </div>
    </ReactLayoutDevtoolsProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersPage/i }));

  expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();

  expect(screen.queryByRole('dialog')).toBeNull();
});

it('starts compact, supports keyboard move and resize, and persists panel geometry', () => {
  const store = source();
  const first = render(<ReactLayoutDevtools source={store} initialIsOpen />);
  const panel = screen.getByRole('dialog');
  const initialWidth = parseFloat(panel.style.width);
  const initialHeight = parseFloat(panel.style.height);
  const x = parseFloat(panel.style.left);

  expect(initialWidth).toBeLessThanOrEqual(560);

  expect(initialHeight).toBeLessThan(window.innerHeight * 0.7);

  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Move devtools panel' }),
    { key: 'ArrowLeft' }
  );

  expect(parseFloat(panel.style.left)).toBe(x - 10);

  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Resize devtools panel' }),
    { key: 'ArrowLeft' }
  );

  expect(parseFloat(panel.style.width)).toBe(initialWidth + 10);

  first.unmount();

  render(<ReactLayoutDevtools source={store} initialIsOpen />);

  expect(parseFloat(screen.getByRole('dialog').style.width)).toBe(
    initialWidth + 10
  );

  fireEvent.click(screen.getByRole('button', { name: 'Expand panel' }));

  expect(parseFloat(screen.getByRole('dialog').style.width)).toBe(
    window.innerWidth - 32
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Restore compact panel' })
  );

  fireEvent.click(screen.getByRole('button', { name: 'Dock panel' }));

  expect(screen.getByRole('button', { name: 'Undock panel' })).toBeTruthy();

  expect(parseFloat(screen.getByRole('dialog').style.width)).toBe(
    window.innerWidth - 32
  );
});

function pointer(target: HTMLElement, type: string, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });

  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
  });

  fireEvent(target, event);
}

it('supports pointer resizing and cancels a drag without saving the draft', () => {
  render(<ReactLayoutDevtools source={source()} initialIsOpen />);

  const panel = screen.getByRole('dialog');
  const resize = screen.getByRole('button', { name: 'Resize devtools panel' });
  const width = parseFloat(panel.style.width);
  const height = parseFloat(panel.style.height);

  pointer(resize, 'pointerdown', 100, 100);

  pointer(resize, 'pointermove', 80, 70);

  pointer(resize, 'pointerup', 80, 70);

  expect(parseFloat(panel.style.width)).toBe(width + 20);

  expect(parseFloat(panel.style.height)).toBe(height + 30);

  const move = screen.getByRole('button', { name: 'Move devtools panel' });
  const left = panel.style.left;

  pointer(move, 'pointerdown', 100, 100);

  pointer(move, 'pointermove', 50, 50);

  pointer(move, 'pointercancel', 50, 50);

  expect(panel.style.left).toBe(left);
});

it('adapts embedded content to a narrow host without imposing floating dimensions', () => {
  class Observer {
    constructor(
      private callback: (entries: { contentRect: { width: number } }[]) => void
    ) {}

    observe() {
      this.callback([{ contentRect: { width: 480 } }]);
    }

    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', Observer);

  try {
    render(<ReactLayoutDevtoolsContent source={source()} />);

    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersPage/i }));

    expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();

    expect(
      screen.getByLabelText('Scrollable relationship graph')
    ).not.toBeVisible();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('preserves collapsed tree branches when navigating back from Details', () => {
  const store = source();

  store.node({ id: 'state', kind: 'state', label: 'Loading' });
  store.edge('layout', 'state', 'defines');

  render(
    <ReactLayoutDevtoolsContent
      source={store}
      layout="compact"
      config={{ initialView: 'tree' }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Collapse UsersPage' }));
  fireEvent.click(screen.getByRole('treeitem', { name: 'layout UsersPage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back to explorer' }));

  expect(screen.getByRole('button', { name: 'Expand UsersPage' })).toBeTruthy();
  expect(screen.queryByRole('treeitem', { name: 'state Loading' })).toBeNull();
});
