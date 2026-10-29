import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent } from '../src';

it('shows source locations and opens the adapter editor endpoint', async () => {
  const store = createInspectionStore();

  store.node({
    id: 'layout',
    kind: 'layout',
    label: 'Users',
    source: {
      file: 'page.tsx',
      line: 4,
      column: 2,
      editorUrl: '/__open-in-editor?file=page.tsx%3A4%3A2',
    },
    registrationSource: { file: 'base.ts', line: 1, column: 1 },
  });

  const fetch = vi.fn().mockResolvedValue({ ok: true });

  vi.stubGlobal('fetch', fetch);

  try {
    render(<ReactLayoutDevtoolsContent source={store} />);

    fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*Users/i }));

    expect(screen.getByText('page.tsx:4:2')).toBeTruthy();

    expect(screen.getByText('base.ts:1:1')).toBeTruthy();

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'page.tsx:4:2' }))
    );

    expect(fetch).toHaveBeenCalledWith(
      '/__open-in-editor?file=page.tsx%3A4%3A2'
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it('targets selected instances and clears a forced render state on inspector disconnect', async () => {
  const store = createInspectionStore();

  store.node({ id: 'layout', kind: 'layout', label: 'Users' });

  store.node({ id: 'default', kind: 'state', label: 'default' });

  store.node({ id: 'loading', kind: 'state', label: 'Loading' });

  store.edge('layout', 'default', 'defines');

  store.edge('layout', 'loading', 'defines');

  const first = vi.fn(),
    second = vi.fn();

  store.registerPreview(
    {
      id: 'first',
      layout: 'layout',
      state: 'default',
      states: ['default', 'loading'],
    },
    first
  );

  store.registerPreview(
    {
      id: 'second',
      layout: 'layout',
      state: 'loading',
      states: ['default', 'loading'],
    },
    second
  );

  const view = render(<ReactLayoutDevtoolsContent source={store} />);

  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*Users/i }));

  fireEvent.change(screen.getByLabelText('Preview instance'), {
    target: { value: 'second' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Loading' }));

  expect(first).not.toHaveBeenCalled();

  expect(second).toHaveBeenLastCalledWith('loading');

  expect(await screen.findByText('Forced: Loading')).toBeTruthy();

  view.unmount();

  expect(second).toHaveBeenLastCalledWith(undefined);
});
