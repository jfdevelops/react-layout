import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent } from '../src';
import css from '../styles.css?inline';

afterEach(() => {
  cleanup();

  window.localStorage.clear();
});

const states = {
  default: 'default',
  loading: 'Loading',
  error: 'Error',
  'not-found': 'NotFound',
  empty: 'Empty',
};

function storeWithStates() {
  const store = createInspectionStore();

  store.node({ id: 'layout', kind: 'layout', label: 'Users' });

  for (const [id, label] of Object.entries(states)) {
    store.node({ id, kind: 'state', label });

    store.edge('layout', id, 'defines');
  }

  return store;
}

const icon = (element: HTMLElement) =>
  element.querySelector<SVGElement>('[data-state-icon]');

it('shows built-in state icons, and a generic one for custom states, in the graph and tree', () => {
  render(<ReactLayoutDevtoolsContent source={storeWithStates()} />);

  const cards = within(screen.getByLabelText('Layout relationships'));

  for (const [label, kind] of [
    ['default', 'default'],
    ['Loading', 'Loading'],
    ['Error', 'Error'],
    ['NotFound', 'NotFound'],
    ['Empty', 'custom'],
  ]) {
    const card = cards.getByRole('button', {
      name: new RegExp(`^state ${label}$`, 'i'),
    });

    expect(icon(card)?.dataset.stateIcon).toBe(kind);

    expect(icon(card)).toHaveAttribute('aria-hidden', 'true');
  }

  expect(cards.getByRole('button', { name: /^layout Users$/i })).not.toContainHTML(
    'data-state-icon'
  );

  fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));

  const row = screen.getByRole('treeitem', { name: 'state NotFound' });

  expect(icon(row)?.dataset.stateIcon).toBe('NotFound');
});

it('spins the Loading icon only while that state is forced, and never with reduced motion', async () => {
  const store = storeWithStates();

  store.registerPreview(
    {
      id: 'instance',
      layout: 'layout',
      state: 'default',
      states: ['default', 'loading'],
    },
    vi.fn()
  );

  render(<ReactLayoutDevtoolsContent source={store} />);

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*Users/i }));

  const loading = screen.getByRole('button', { name: 'Loading' });

  expect(icon(loading)?.dataset.stateIcon).toBe('Loading');

  expect(icon(loading)).not.toHaveAttribute('data-spinning');

  fireEvent.click(loading);

  await screen.findByText('Forced: Loading');

  expect(
    icon(screen.getByRole('button', { name: 'Loading' }))
  ).toHaveAttribute('data-spinning');

  expect(css).toMatch(
    /prefers-reduced-motion: reduce\)\s*{\s*\[data-state-icon\]\[data-spinning\]\s*{\s*animation: none/
  );
});

it('shows the state icon in node details', () => {
  render(<ReactLayoutDevtoolsContent source={storeWithStates()} />);

  fireEvent.click(screen.getByRole('button', { name: /^state Error$/i }));

  const heading = screen.getByRole('heading', { level: 3, name: 'Error' });

  expect(icon(heading)?.dataset.stateIcon).toBe('Error');

  expect(icon(heading)).toHaveAttribute('width', '14');
});
