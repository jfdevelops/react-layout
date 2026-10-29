import type { ComponentType } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createLazyLoader } from '../../src/lazy/create-lazy-loader';
import { LazyBoundary } from '../../src/lazy/lazy-boundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('caches synchronous member mappings rather than recreating their component types', async () => {
  const map = vi.fn((value: string) => () => <p>{value}</p>);
  const loader = createLazyLoader({
    load: async () => 'Loaded',
    select: (value) => value,
    label: 'users',
  });
  await loader.preload();
  const props = { loader, map, resource: 'users', componentProps: {} };
  const view = render(<LazyBoundary {...props} />);
  expect(screen.getByText('Loaded')).toBeInTheDocument();
  view.rerender(<LazyBoundary {...props} />);
  expect(map).toHaveBeenCalledOnce();
  expect(loader.component(undefined, map)).toBe(
    loader.component(undefined, map)
  );
});

it('handles a synchronously missing member inside the boundary and reloads on retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const onLoadError = vi.fn();
  const load = vi.fn(
    async (): Promise<{ Ready: ComponentType; Missing?: ComponentType }> => ({
      Ready: () => <p>Ready</p>,
      ...(load.mock.calls.length > 1
        ? { Missing: () => <p>Recovered</p> }
        : {}),
    })
  );
  const loader = createLazyLoader({
    load,
    select: (value) => value,
    label: 'users',
    hooks: { onLoadError },
  });
  await loader.preload();
  render(
    <>
      <LazyBoundary
        loader={loader}
        member="Missing"
        resource="users"
        componentProps={{}}
        fallback={<p>Reloading</p>}
        ErrorComponent={({ error, retry }) => (
          <button onClick={retry}>{error.code}</button>
        )}
      />
      <LazyBoundary
        loader={loader}
        member="Ready"
        resource="users"
        componentProps={{}}
      />
    </>
  );
  expect(screen.getByText('Ready')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'lazyResourceStateNotFound' })
  ).toBeInTheDocument();
  expect(loader.status).toBe('error');
  expect(onLoadError).toHaveBeenCalledOnce();
  expect(load).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole('button', { name: 'lazyResourceStateNotFound' })
  );
  expect(screen.getByText('Reloading')).toBeInTheDocument();
  expect(await screen.findByText('Recovered')).toBeInTheDocument();
  expect(loader.status).toBe('resolved');
  expect(load).toHaveBeenCalledTimes(2);
});

it('ignores values from an old pending generation after reset', async () => {
  let oldResolve!: (value: ComponentType) => void;
  let newResolve!: (value: ComponentType) => void;
  const old = new Promise<ComponentType>((resolve) => {
    oldResolve = resolve;
  });
  const fresh = new Promise<ComponentType>((resolve) => {
    newResolve = resolve;
  });
  const loader = createLazyLoader({
    load: vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(fresh),
    select: (value: ComponentType) => value,
    label: 'users',
  });
  const stale = loader.get();
  loader.reset();
  const current = loader.get();
  await act(async () => {
    oldResolve(() => <p>Stale</p>);
    await stale;
  });
  expect(loader.status).toBe('loading');
  render(
    <LazyBoundary
      loader={loader}
      resource="users"
      componentProps={{}}
      fallback={<p>Waiting for current</p>}
    />
  );
  expect(screen.getByText('Waiting for current')).toBeInTheDocument();
  await act(async () => {
    newResolve(() => <p>Current</p>);
    await current;
  });
  expect(screen.getByText('Current')).toBeInTheDocument();
  expect(screen.queryByText('Stale')).toBeNull();
});
