import { writeFileSync } from 'node:fs';
import { Profiler } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtools, ReactLayoutDevtoolsContent } from '../src';

afterEach(() => {
  cleanup();

  window.localStorage.clear();
});

/** 32 lazy resources, each with four states declaring four composables (672 nodes). */
function largeApp() {
  const store = createInspectionStore();

  for (let i = 0; i < 32; i++) {
    const layout = store.node({
      id: `layout-${i}`,
      kind: 'layout',
      label: `Resource ${i}`,
    });

    for (const state of ['default', 'Loading', 'Error', 'NotFound']) {
      const id = store.node({ id: `${i}-${state}`, kind: 'state', label: state });

      store.edge(layout, id, 'defines');

      for (let j = 0; j < 4; j++) {
        const composable = store.node({
          id: `${id}-${j}`,
          kind: 'composable',
          label: `Content ${j}`,
        });

        store.edge(id, composable, 'declares');
      }
    }
  }

  return store;
}

it('profiles selection, search, view switching, zoom and mount storms on 672 nodes', async () => {
  const store = largeApp();
  const measurements: Record<string, number[]> = {};
  let action = 'initial';

  render(
    <Profiler
      id="large-app"
      onRender={(_id, _phase, duration) =>
        (measurements[action] ??= []).push(duration)
      }
    >
      <ReactLayoutDevtoolsContent
        source={store}
        config={{ initialFilters: { showComposables: true } }}
        storageKey="perf-fixture"
      />
    </Profiler>
  );

  action = 'select';
  fireEvent.click(screen.getByRole('button', { name: /LAYOUT.*Resource 0$/i }));

  action = 'search';
  fireEvent.change(screen.getByLabelText('Search graph'), {
    target: { value: 'Content' },
  });

  action = 'view';
  fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));

  action = 'graph';
  fireEvent.click(screen.getByRole('tab', { name: 'Graph' }));

  action = 'zoom';
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

  action = 'mount storm';
  await act(async () => {
    for (let i = 0; i < 100; i++) store.mount('layout-0')();
  });

  // Worst commit per interaction; timings are reported rather than asserted.
  const worst = Object.fromEntries(
    Object.entries(measurements).map(([key, values]) => [
      key,
      Math.max(...values),
    ])
  );

  if (process.env.DEVTOOLS_BENCHMARK_OUTPUT)
    writeFileSync(
      process.env.DEVTOOLS_BENCHMARK_OUTPUT,
      JSON.stringify(worst, null, 2)
    );

  // 200 store changes coalesce into a couple of commits, not one per change.
  expect(measurements['mount storm'].length).toBeLessThanOrEqual(2);
});

it('windows large trees and graphs but still locates rows outside the window', async () => {
  render(
    <ReactLayoutDevtoolsContent
      source={largeApp()}
      config={{ initialFilters: { showComposables: true } }}
    />
  );

  expect(
    screen.getAllByRole('button', { name: /^(layout|state|composable) /i })
      .length
  ).toBeLessThan(672);

  const search = screen.getByLabelText('Search graph');

  fireEvent.change(search, { target: { value: 'Resource 31' } });

  fireEvent.click(
    await screen.findByRole('button', { name: /LAYOUT.*Resource 31$/i })
  );

  fireEvent.change(search, { target: { value: '' } });

  fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));

  expect(screen.getAllByRole('treeitem').length).toBeLessThan(672);

  expect(screen.queryByRole('treeitem', { name: /Resource 31/ })).toBeNull();

  const original = HTMLElement.prototype.scrollTo;

  HTMLElement.prototype.scrollTo = vi.fn();

  try {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Locate selection' }));
    });

    expect(screen.getByRole('treeitem', { name: /Resource 31/ })).toHaveFocus();
  } finally {
    HTMLElement.prototype.scrollTo = original;
  }
});

it('does not subscribe the inspection source while the floating panel is closed', () => {
  const store = largeApp();
  let subscriptions = 0;
  const source = {
    getSnapshot: store.getSnapshot,
    subscribe(listener: () => void) {
      subscriptions++;

      const stop = store.subscribe(listener);

      return () => {
        subscriptions--;

        stop();
      };
    },
  };

  render(<ReactLayoutDevtools source={source} />);

  expect(subscriptions).toBe(0);
});
