import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtools } from '../src';
import { summarizeGraph } from '../src/toolbar-summary';

afterEach(() => {
  cleanup();

  window.localStorage.clear();
  vi.useRealTimers();
});

const storageKey = 'react-layout-devtools:preferences:v1';

function app() {
  const store = createInspectionStore();

  store.node({
    id: 'resource',
    kind: 'resource',
    label: 'admin.appointments',
  });

  store.node({ id: 'layout', kind: 'layout', label: 'AppointmentsLayout' });

  store.edge('resource', 'layout', 'renders');

  for (const [id, label] of [
    ['default', 'default'],
    ['loading', 'Loading'],
  ]) {
    store.node({ id, kind: 'state', label });

    store.edge('layout', id, 'defines');
  }

  store.node({ id: 'lazy-a', kind: 'lazy', label: 'a', status: 'loading' });

  store.node({ id: 'lazy-b', kind: 'lazy', label: 'b', status: 'error' });

  store.mount('layout', 'default');

  const preview = vi.fn();

  store.registerPreview(
    {
      id: 'instance',
      layout: 'layout',
      state: 'default',
      states: ['default', 'loading'],
    },
    preview
  );

  return { store, preview };
}

const bar = () =>
  screen.getByRole('region', { name: 'React Layout Devtools toolbar' });

it('summarizes counts and the current resource and state', () => {
  const { store } = app();

  expect(summarizeGraph(store.getSnapshot())).toMatchObject({
    activeLayouts: 1,
    loading: 1,
    failed: 1,
    current: { resource: 'appointments', state: 'default' },
  });

  store.preview('instance', 'loading');

  expect(summarizeGraph(store.getSnapshot()).current?.state).toBe('Loading');
});

it('docks a bar with live counts, the current layout and quick toggles', async () => {
  const { store, preview } = app();

  render(<ReactLayoutDevtools source={store} variant="toolbar" />);

  const toolbar = within(bar());

  expect(
    toolbar.getByRole('group', { name: 'Layout status' })
  ).toHaveTextContent('1 active1 loading1 failed');

  expect(toolbar.getByText('1 failed')).toHaveAttribute('data-failed', 'true');

  expect(toolbar.getByLabelText('Current layout')).toHaveTextContent(
    'appointments · default'
  );

  expect(
    toolbar.getByRole('button', { name: 'Show composable outlines' })
  ).toBeTruthy();

  fireEvent.change(toolbar.getByLabelText('Override state'), {
    target: { value: 'loading' },
  });

  expect(preview).toHaveBeenLastCalledWith('loading');

  await act(async () => {});

  expect(toolbar.getByLabelText('Current layout')).toHaveTextContent(
    'appointments · Loading'
  );

  expect(screen.queryByRole('region', { name: 'Layout devtools' })).toBeNull();
});

it('expands into a resizable drawer whose height persists', async () => {
  const { store } = app();
  const view = render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  const toggle = within(bar()).getByRole('button', { name: 'Expand devtools' });

  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(toggle);

  const drawer = screen.getByRole('region', { name: 'Layout devtools' });

  expect(within(drawer).getByLabelText('Search graph')).toBeTruthy();

  expect(
    within(bar()).getByRole('button', { name: 'Collapse devtools' })
  ).toHaveAttribute('aria-controls', drawer.id);

  expect(drawer.style.height).toBe('360px');

  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Resize devtools drawer' }),
    { key: 'ArrowUp', shiftKey: true }
  );

  expect(drawer.style.height).toBe('424px');

  expect(JSON.parse(localStorage.getItem(storageKey)!).toolbar).toEqual({
    height: 424,
  });

  view.unmount();

  render(
    <ReactLayoutDevtools source={store} variant="toolbar" initialIsOpen />
  );

  expect(
    screen.getByRole('region', { name: 'Layout devtools' }).style.height
  ).toBe('424px');
});

it('reserves space at the bottom of the page and releases it on unmount', () => {
  const { store } = app();

  document.body.style.paddingBottom = '10px';

  const view = render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  const root = document.documentElement;

  expect(
    root.style.getPropertyValue('--react-layout-devtools-toolbar-height')
  ).toBe('32px');

  expect(document.body.style.paddingBottom).toBe(
    'calc(10px + var(--react-layout-devtools-toolbar-height, 0px))'
  );

  fireEvent.click(
    within(bar()).getByRole('button', { name: 'Expand devtools' })
  );

  expect(
    root.style.getPropertyValue('--react-layout-devtools-toolbar-height')
  ).toBe('392px');

  view.unmount();

  expect(
    root.style.getPropertyValue('--react-layout-devtools-toolbar-height')
  ).toBe('');

  expect(document.body.style.paddingBottom).toBe('10px');

  document.body.style.paddingBottom = '';
});

it('toggles and hides with keyboard shortcuts, except while typing, and collapses on Escape', () => {
  const { store } = app();

  render(<ReactLayoutDevtools source={store} variant="toolbar" />);

  const shortcut = (code: string, target: Element = document.body) =>
    fireEvent.keyDown(
      target,
      code === 'KeyJ'
        ? { code, ctrlKey: true }
        : { code, altKey: true, shiftKey: true }
    );

  shortcut('KeyJ');

  expect(screen.getByRole('region', { name: 'Layout devtools' })).toBeTruthy();

  shortcut('KeyJ', screen.getByLabelText('Search graph'));

  expect(screen.getByRole('region', { name: 'Layout devtools' })).toBeTruthy();

  shortcut('KeyJ');

  expect(screen.queryByRole('region', { name: 'Layout devtools' })).toBeNull();

  shortcut('KeyJ');

  fireEvent.keyDown(screen.getByLabelText('Search graph'), { key: 'Escape' });

  expect(screen.queryByRole('region', { name: 'Layout devtools' })).toBeNull();

  expect(
    within(bar()).getByRole('button', { name: 'Expand devtools' })
  ).toHaveFocus();

  shortcut('KeyH');

  expect(
    screen.queryByRole('region', { name: 'React Layout Devtools toolbar' })
  ).toBeNull();

  expect(
    document.documentElement.style.getPropertyValue(
      '--react-layout-devtools-toolbar-height'
    )
  ).toBe('0px');

  shortcut('KeyH');

  expect(bar()).toBeTruthy();

  fireEvent.click(within(bar()).getByRole('button', { name: 'Hide toolbar' }));

  expect(
    screen.queryByRole('region', { name: 'React Layout Devtools toolbar' })
  ).toBeNull();
});

it('switches between floating and toolbar at runtime and persists the choice', () => {
  const { store } = app();
  const view = render(<ReactLayoutDevtools source={store} initialIsOpen />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Switch to bottom toolbar' })
  );

  expect(bar()).toBeTruthy();

  expect(screen.queryByRole('region', { name: 'Layout devtools' })).toBeNull();

  expect(
    within(bar()).getByRole('button', { name: 'Expand devtools' })
  ).toHaveAttribute('aria-expanded', 'false');

  expect(JSON.parse(localStorage.getItem(storageKey)!).variant).toBe('toolbar');

  view.unmount();

  // The saved choice wins over the default floating variant.
  const next = render(<ReactLayoutDevtools source={store} />);

  fireEvent.click(
    within(bar()).getByRole('button', { name: 'Switch to floating panel' })
  );

  expect(
    screen.queryByRole('region', { name: 'React Layout Devtools toolbar' })
  ).toBeNull();

  expect(
    screen.getByRole('dialog', { name: 'React Layout Devtools' })
  ).toBeTruthy();

  next.unmount();

  render(<ReactLayoutDevtools source={store} variant="toolbar" />);

  expect(
    screen.getByRole('button', { name: 'Open React Layout Devtools' })
  ).toBeTruthy();
});

it.each(['ctrlKey', 'metaKey'] as const)(
  'toggles the floating panel with %s + J',
  async (modifier) => {
    const { store } = app();
    render(<ReactLayoutDevtools source={store} />);
    fireEvent.keyDown(document.body, {
      code: 'KeyJ',
      key: 'j',
      [modifier]: true,
    });
    expect(
      screen.getByRole('dialog', { name: 'React Layout Devtools' })
    ).toBeTruthy();
    fireEvent.keyDown(document.body, {
      code: 'KeyJ',
      key: 'j',
      [modifier]: true,
    });
    // The floating panel animates closed before unmounting.
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'React Layout Devtools' })
      ).toBeNull()
    );
    expect(
      screen.getByRole('button', { name: 'Open React Layout Devtools' })
    ).toBeTruthy();
  }
);

it('supports Command+J in toolbar mode and ignores repeated keydown events', () => {
  const { store } = app();
  render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  fireEvent.keyDown(document.body, { code: 'KeyJ', metaKey: true });
  expect(screen.getByRole('region', { name: 'Layout devtools' })).toBeTruthy();
  fireEvent.keyDown(document.body, {
    code: 'KeyJ',
    metaKey: true,
    repeat: true,
  });
  expect(screen.getByRole('region', { name: 'Layout devtools' })).toBeTruthy();
  fireEvent.keyDown(document.body, { code: 'KeyJ', metaKey: true });
  expect(screen.queryByRole('region', { name: 'Layout devtools' })).toBeNull();
});

it('shares the FAB animation and keeps the drawer mounted until its exit finishes', () => {
  vi.useFakeTimers();
  const { store } = app();
  const view = render(<ReactLayoutDevtools source={store} initialIsOpen />);
  const panel = screen.getByRole('dialog', { name: 'React Layout Devtools' });
  const enter = panel.style.animation;
  fireEvent.click(
    screen.getByRole('button', { name: 'Close React Layout Devtools' })
  );
  const exit = panel.style.animation;
  view.unmount();

  render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  fireEvent.click(screen.getByRole('button', { name: 'Expand devtools' }));
  const drawer = screen.getByRole('region', { name: 'Layout devtools' });
  expect(drawer.style.animation).toBe(enter);
  act(() => vi.advanceTimersByTime(280));
  expect(drawer.style.animation).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse devtools' }));
  expect(drawer.style.animation).toBe(exit);
  expect(drawer).toBeInTheDocument();
  expect(drawer).toHaveAttribute('aria-hidden', 'true');
  // Child animations must not prematurely remove the drawer.
  fireEvent.animationEnd(drawer.querySelector('button')!);
  expect(drawer).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(220));
  expect(drawer).not.toBeInTheDocument();
});
