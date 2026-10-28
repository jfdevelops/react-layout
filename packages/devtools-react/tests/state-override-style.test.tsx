import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent } from '../src';

afterEach(() => {
  cleanup();

  window.localStorage.clear();
});

it('moves the active style to the forced state override', async () => {
  const store = createInspectionStore();

  store.node({ id: 'layout', kind: 'layout', label: 'Users' });

  for (const [id, label] of [
    ['default', 'default'],
    ['loading', 'Loading'],
    ['error', 'Error'],
  ])
    store.edge('layout', store.node({ id, kind: 'state', label }), 'defines');

  store.registerPreview(
    {
      id: 'instance',
      layout: 'layout',
      state: 'default',
      states: ['default', 'loading', 'error'],
    },
    vi.fn()
  );

  render(<ReactLayoutDevtoolsContent source={store} />);

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*Users/i }));

  const overrides = () =>
    ['Auto', 'default', 'Loading', 'Error'].map((name) =>
      screen.getByRole('button', { name })
    );
  const active = () =>
    overrides()
      .filter((button) => getComputedStyle(button).fontWeight === '700')
      .map((button) => button.textContent);

  expect(active()).toEqual(['Auto']);

  fireEvent.click(screen.getByRole('button', { name: 'Loading' }));

  await screen.findByText('Forced: Loading');

  expect(active()).toEqual(['Loading']);

  expect(
    overrides().filter((button) => button.getAttribute('aria-pressed') === 'true')
  ).toEqual([screen.getByRole('button', { name: 'Loading' })]);

  fireEvent.click(screen.getByRole('button', { name: 'Auto' }));

  await vi.waitFor(() => expect(active()).toEqual(['Auto']));
});

it('marks "Preview this state" active when its state is forced', async () => {
  const store = createInspectionStore();

  store.node({ id: 'layout', kind: 'layout', label: 'Users' });

  store.edge(
    'layout',
    store.node({ id: 'loading', kind: 'state', label: 'Loading' }),
    'defines'
  );

  store.registerPreview(
    { id: 'instance', layout: 'layout', state: 'loading', states: ['loading'] },
    vi.fn()
  );

  render(<ReactLayoutDevtoolsContent source={store} />);

  fireEvent.click(screen.getByRole('button', { name: /^state Loading$/i }));

  const preview = screen.getByRole('button', { name: 'Preview this state' });

  expect(preview).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(preview);

  await screen.findByText('Forced: Loading');

  expect(
    screen.getByRole('button', { name: 'Preview this state' })
  ).toHaveAttribute('aria-pressed', 'true');
});
