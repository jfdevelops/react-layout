import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtools } from '../src';
function pointer(button: HTMLElement, type: string, x: number, y: number) {
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
  fireEvent(button, event);
}
it('moves the launcher without opening and preserves its location after closing the panel', () => {
  vi.useFakeTimers();
  try {
    render(<ReactLayoutDevtools source={createInspectionStore()} />);
    const button = screen.getByRole('button', {
      name: 'Open React Layout Devtools',
    });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(900, 650, 52, 52)
    );
    pointer(button, 'pointerdown', 925, 675);
    pointer(button, 'pointermove', 225, 225);
    pointer(button, 'pointerup', 225, 225);
    fireEvent.click(button, { detail: 1 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveStyle({ left: '200px', top: '200px' });
    fireEvent.click(button, { detail: 1 });
    const dialog = screen.getByRole('dialog');
    act(() => vi.advanceTimersByTime(300));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(300));
    expect(
      screen.getByRole('button', { name: 'Open React Layout Devtools' })
    ).toHaveStyle({ left: '200px', top: '200px' });
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
it('treats a small pointer movement as a click and recovers after pointer cancellation', () => {
  render(<ReactLayoutDevtools source={createInspectionStore()} />);
  const button = screen.getByRole('button', {
    name: 'Open React Layout Devtools',
  });
  pointer(button, 'pointerdown', 20, 20);
  pointer(button, 'pointermove', 100, 100);
  pointer(button, 'pointercancel', 100, 100);
  expect(button.style.cursor).toBe('grab');
  pointer(button, 'pointerdown', 20, 20);
  pointer(button, 'pointermove', 22, 21);
  pointer(button, 'pointerup', 22, 21);
  fireEvent.click(button, { detail: 1 });
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('supports keyboard movement and keeps the button visible when the viewport shrinks', () => {
  const width = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
  const height = Object.getOwnPropertyDescriptor(window, 'innerHeight')!;
  try {
    render(<ReactLayoutDevtools source={createInspectionStore()} />);
    const button = screen.getByRole('button', {
      name: 'Open React Layout Devtools',
    });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(300, 300, 52, 52)
    );
    fireEvent.keyDown(button, { key: 'ArrowLeft', altKey: true });
    expect(button).toHaveStyle({ left: '290px', top: '300px' });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 120,
    });
    fireEvent(window, new Event('resize'));
    expect(button).toHaveStyle({ left: '90px', top: '60px' });
    expect(screen.queryByRole('dialog')).toBeNull();
  } finally {
    Object.defineProperty(window, 'innerWidth', width);
    Object.defineProperty(window, 'innerHeight', height);
    vi.restoreAllMocks();
  }
});
