import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtools, ReactLayoutDevtoolsContent } from '../src';

const fixtures: HTMLElement[] = [];
afterEach(() => {
  cleanup();
  fixtures.splice(0).forEach((element) => element.remove());
  vi.restoreAllMocks();
});
function app() {
  const store = createInspectionStore();
  store.node({ id: 'resource', kind: 'resource', label: 'users' });
  store.node({ id: 'layout', kind: 'layout', label: 'UsersLayout' });
  store.node({ id: 'state', kind: 'state', label: 'default' });
  store.node({ id: 'header', kind: 'composable', label: 'Header' });
  store.edge('resource', 'layout', 'renders');
  store.edge('layout', 'state', 'defines');
  store.edge('state', 'header', 'declares');
  store.mount('layout', 'state', 'header');
  const element = document.createElement('button');
  element.dataset.rlOwners = JSON.stringify(['layout', 'state', 'resource']);
  element.textContent = 'App action';
  document.body.append(element);
  fixtures.push(element);
  let top = 20;
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 10, top, width: 200, height: 80 }) as DOMRect
  );
  return {
    store,
    element,
    move: () => {
      top = 120;
    },
  };
}
const boxes = () => document.querySelectorAll('[data-rl-highlight]');

it('highlights the toolbar current layout on hover and focus with global outlines off', async () => {
  const { store, element } = app();
  const click = vi.fn();
  element.onclick = click;
  render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  const current = screen.getByRole('button', { name: 'Current layout' });
  expect(boxes()).toHaveLength(0);
  fireEvent.pointerEnter(current);
  await waitFor(() => expect(boxes()).toHaveLength(1));
  expect(boxes()[0]).toHaveAttribute('data-rl-highlight', 'layout');
  expect(document.querySelector('[data-rl-highlight-layer]')).toHaveStyle({
    pointerEvents: 'none',
  });
  fireEvent.click(element);
  expect(click).toHaveBeenCalledOnce();
  fireEvent.pointerLeave(current);
  expect(boxes()).toHaveLength(0);
  fireEvent.focus(current);
  await waitFor(() => expect(boxes()).toHaveLength(1));
  fireEvent.blur(current);
  expect(boxes()).toHaveLength(0);
  expect(document.querySelector('[data-rl-outline-layer]')).toBeNull();
});

it('toggles a selected item highlight, follows scroll and DOM removal, and clears on selection changes', async () => {
  const { store, element, move } = app();
  const view = render(<ReactLayoutDevtoolsContent source={store} />);
  fireEvent.click(
    screen.getByRole('button', { name: /^layout.*UsersLayout$/i })
  );
  const highlight = screen.getByRole('button', {
    name: 'Highlight UsersLayout on page',
  });
  fireEvent.click(highlight);
  await waitFor(() => expect(boxes()).toHaveLength(1));
  expect(highlight).toHaveAttribute('aria-pressed', 'true');
  move();
  fireEvent.scroll(window);
  await waitFor(() => expect(boxes()[0]).toHaveStyle({ top: '120px' }));
  fireEvent.click(highlight);
  expect(boxes()).toHaveLength(0);
  fireEvent.click(highlight);
  await waitFor(() => expect(boxes()).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: /^state.*default$/i }));
  expect(boxes()).toHaveLength(0);
  fireEvent.click(
    screen.getByRole('button', { name: 'Highlight default on page' })
  );
  await waitFor(() => expect(boxes()).toHaveLength(1));
  element.remove();
  await waitFor(() => expect(boxes()).toHaveLength(0));
  view.unmount();
  expect(document.querySelector('[data-rl-highlight-layer]')).toBeNull();
});

it('falls back to owned composables, excluding references and graph cycles', async () => {
  const { store, element } = app();
  delete element.dataset.rlOwners;
  element.dataset.rlNode = 'header';
  store.node({ id: 'unrelated', kind: 'composable', label: 'Shared' });
  store.edge('header', 'unrelated', 'references');
  store.edge('header', 'layout', 'declares');
  const other = element.cloneNode() as HTMLElement;
  other.dataset.rlNode = 'unrelated';
  document.body.append(other);
  fixtures.push(other);
  vi.spyOn(other, 'getBoundingClientRect').mockReturnValue({
    left: 300,
    top: 0,
    width: 100,
    height: 80,
  } as DOMRect);
  render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  fireEvent.pointerEnter(
    screen.getByRole('button', { name: 'Current layout' })
  );
  await waitFor(() => expect(boxes()).toHaveLength(1));
  expect(boxes()[0]).toHaveStyle({ left: '10px' });
});

it('measures visible children of display:contents roots and all mounted instances', async () => {
  const { store, element } = app();
  vi.mocked(element.getBoundingClientRect).mockReturnValue({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  } as DOMRect);
  const child = document.createElement('span');
  element.append(child);
  vi.spyOn(child, 'getBoundingClientRect').mockReturnValue({
    left: 15,
    top: 25,
    width: 120,
    height: 30,
  } as DOMRect);
  const other = document.createElement('div');
  other.dataset.rlOwners = element.dataset.rlOwners;
  document.body.append(other);
  fixtures.push(other);
  vi.spyOn(other, 'getBoundingClientRect').mockReturnValue({
    left: 400,
    top: 100,
    width: 100,
    height: 80,
  } as DOMRect);
  render(<ReactLayoutDevtools source={store} variant="toolbar" />);
  fireEvent.pointerEnter(
    screen.getByRole('button', { name: 'Current layout' })
  );
  await waitFor(() => expect(boxes()).toHaveLength(2));
  expect(boxes()[0]).toHaveStyle({ left: '15px', width: '120px' });
  expect(boxes()[1]).toHaveStyle({ left: '400px' });
});
