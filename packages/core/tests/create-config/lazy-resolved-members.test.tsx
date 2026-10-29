import { useLayoutEffect, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDefinedResourceLayout } from '../../src';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('does not commit a second module fallback when a route swaps Loading for the page', async () => {
  const commits: string[] = [];
  function Content({ label }: { label: string }) {
    useLayoutEffect(() => {
      commits.push(label);
    }, [label]);
    return <p>{label}</p>;
  }
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  factory.defineLazyDefaults({
    Loading: () => <Content label="Module loading" />,
  });
  const Users = factory
    .defineResourceLayout({
      render: {
        default: () => <Content label="Page" />,
        Loading: () => <Content label="Resource loading" />,
      },
    })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const load = vi.fn(async () => {
    await gate;
    return { Users };
  });
  const Page = factory.defineResourceLayout.lazy({ resource: 'users', load });
  const pending = render(<Page.Loading />);
  expect(screen.getByText('Module loading')).toBeInTheDocument();
  await act(async () => {
    finish();
    await Page.preload();
  });
  expect(screen.getByText('Resource loading')).toBeInTheDocument();
  pending.unmount();
  render(<Page />);
  expect(screen.getByText('Page')).toBeInTheDocument();
  expect(commits).toEqual(['Module loading', 'Resource loading', 'Page']);
  expect(load).toHaveBeenCalledOnce();
});

it.each(['default', 'Loading', 'Error', 'NotFound'] as const)(
  'renders a new %s member synchronously after preload',
  async (member) => {
    const fallback = vi.fn(() => <p>Module loading</p>);
    const factory = createDefinedResourceLayout({ resources: ['users'] });
    factory.defineLazyDefaults({ Loading: fallback });
    const Users = factory
      .defineResourceLayout({
        render: {
          default: () => <p>Ready</p>,
          Loading: () => <p>Resource loading</p>,
          Error: () => <p>Resource error</p>,
          NotFound: () => <p>Resource missing</p>,
        },
      })
      .createResourceLayout({ resource: 'users', name: 'Users' });
    const Page = factory.defineResourceLayout.lazy({
      resource: 'users',
      load: async () => ({ Users }),
    });
    await Page.preload();
    const View = member === 'default' ? Page : Page[member];
    const view = render(<View />);
    expect(view.container.textContent).toBe(
      {
        default: 'Ready',
        Loading: 'Resource loading',
        Error: 'Resource error',
        NotFound: 'Resource missing',
      }[member]
    );
    expect(fallback).not.toHaveBeenCalled();
  }
);

it('preserves loaded child state when its lazy boundary rerenders', async () => {
  function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
  }
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Users = factory
    .defineResourceLayout({ render: () => <Counter /> })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  const Page = factory.defineResourceLayout.lazy({
    resource: 'users',
    load: async () => ({ Users }),
  });
  const view = render(<Page />);
  fireEvent.click(await screen.findByRole('button', { name: 'Count 0' }));
  expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
  view.rerender(<Page />);
  expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
});
