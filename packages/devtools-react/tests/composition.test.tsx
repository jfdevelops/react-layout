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

  expect(screen.getByRole('button', { name: 'Details' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersPage/i }));

  expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();

  expect(screen.queryByLabelText('Scrollable relationship graph')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Explorer' }));

  expect(screen.getByLabelText('Scrollable relationship graph')).toBeTruthy();

  expect(screen.queryByLabelText('Node details')).toBeNull();
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

    expect(screen.getByLabelText('Inspector panes')).toBeTruthy();

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*UsersPage/i }));

    expect(screen.getByRole('heading', { name: 'UsersPage' })).toBeTruthy();

    expect(screen.queryByLabelText('Scrollable relationship graph')).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});
