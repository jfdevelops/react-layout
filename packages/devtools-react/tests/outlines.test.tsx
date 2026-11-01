import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent } from '../src';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document
    .querySelectorAll('[data-app-fixture]')
    .forEach((node) => node.remove());
});

it('persists and resets outlines, labels their owners, selects and highlights nodes without blocking the app', async () => {
  const store = createInspectionStore();
  store.node({ id: 'layout', kind: 'layout', label: 'AppointmentsLayout' });
  store.node({ id: 'header', kind: 'composable', label: 'Header' });
  store.edge('layout', 'header', 'declares');
  const app = document.createElement('button');
  app.dataset.appFixture = '';
  app.dataset.rlNode = 'header';
  app.dataset.rlComposable = 'Header';
  app.textContent = 'App action';
  const click = vi.fn();
  app.onclick = click;
  document.body.append(app);
  let top = 20;
  vi.spyOn(app, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        left: 10,
        top,
        width: 200,
        height: 50,
      }) as DOMRect,
  );
  const view = render(
    <ReactLayoutDevtoolsContent source={store} storageKey="outlines-test" />,
  );
  expect(document.querySelector('[data-rl-outline-layer]')).toBeNull();
  fireEvent.click(screen.getByLabelText('Show composable outlines'));
  const label = await screen.findByRole('button', {
    name: 'Inspect Header in AppointmentsLayout',
  });
  expect(label.textContent).toBe('Header · AppointmentsLayout');
  expect(
    (document.querySelector('[data-rl-outline-layer]') as HTMLElement).style
      .pointerEvents,
  ).toBe('none');
  fireEvent.click(app);
  expect(click).toHaveBeenCalledOnce();
  fireEvent.pointerOver(label);
  expect(document.querySelector('[data-hovered-node="true"]')).toBeTruthy();
  fireEvent.click(label);
  expect(screen.getByRole('heading', { name: 'Header' })).toBeTruthy();
  top = 80;
  fireEvent.scroll(window);
  await waitFor(() =>
    expect(
      (document.querySelector('[data-rl-outline]') as HTMLElement).style.top,
    ).toBe('80px'),
  );
  app.remove();
  await waitFor(() =>
    expect(
      screen.queryByRole('button', {
        name: 'Inspect Header in AppointmentsLayout',
      }),
    ).toBeNull(),
  );
  view.unmount();
  render(
    <ReactLayoutDevtoolsContent source={store} storageKey="outlines-test" />,
  );
  expect(
    screen
      .getByLabelText('Hide composable outlines')
      .getAttribute('aria-pressed'),
  ).toBe('true');
  fireEvent.click(screen.getByLabelText('Reset preferences'));
  expect(document.querySelector('[data-rl-outline-layer]')).toBeNull();
});
