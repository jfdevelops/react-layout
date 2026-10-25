import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent } from '../src';

it('uses the same header and navigable path for every node kind', () => {
  const store = createInspectionStore();
  store.node({ id: 'definition', kind: 'definition', label: 'Application' });
  store.node({ id: 'users', kind: 'resource', label: 'users' });
  store.node({ id: 'admins', kind: 'resource', label: 'users.admins' });
  store.node({ id: 'layout', kind: 'layout', label: 'AdminLayout' });
  store.node({ id: 'state', kind: 'state', label: 'Loading' });
  store.node({ id: 'component', kind: 'composable', label: 'Title' });
  store.node({ id: 'lazy', kind: 'lazy', label: 'Deferred', unresolved: true });
  store.edge('definition', 'users', 'contains');
  store.edge('users', 'admins', 'contains');
  store.edge('admins', 'layout', 'renders');
  store.edge('layout', 'state', 'defines');
  store.edge('state', 'component', 'declares');
  store.edge('definition', 'lazy', 'declares');
  store.mount('layout', 'state');
  render(
    <ReactLayoutDevtoolsContent
      source={store}
      config={{ initialFilters: { showComposables: true } }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /STATE.*Loading/i }));
  const details = screen.getByLabelText('Node details');
  const path = within(details).getByRole('navigation', {
    name: 'Selected node path',
  });
  expect(
    within(path)
      .getAllByRole('button')
      .map((button) => button.textContent)
  ).toEqual(['Application', 'users', 'admins', 'AdminLayout', 'Loading']);
  expect(
    within(path)
      .getByRole('button', { name: 'Loading' })
      .getAttribute('aria-current')
  ).toBe('page');
  expect(
    within(details).getByLabelText('1 mounted instance')
  ).toHaveTextContent('1 mounted');
  fireEvent.click(within(path).getByRole('button', { name: 'admins' }));
  expect(
    within(screen.getByLabelText('Node details')).getByRole('heading', {
      name: 'users.admins',
    })
  ).toBeTruthy();
  for (const [kind, label] of [
    ['definition', 'Application'],
    ['resource', 'users'],
    ['layout', 'AdminLayout'],
    ['state', 'Loading'],
    ['composable', 'Title'],
    ['lazy', 'Deferred'],
  ]) {
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`^${kind}.*${label}$`, 'i'),
      })
    );
    const pane = within(screen.getByLabelText('Node details'));
    expect(
      pane.getByRole('navigation', { name: 'Selected node path' })
    ).toBeTruthy();
    expect(pane.getByRole('heading', { name: label })).toBeTruthy();
    expect(pane.getByLabelText(/mounted instance/)).toBeTruthy();
    expect(pane.getByRole('region', { name: 'Relationships' })).toBeTruthy();
  }
  expect(
    within(screen.getByLabelText('Node details')).getByText('Not loaded')
  ).toBeTruthy();
});

it('keeps ancestor paths available when filters hide the ancestors', () => {
  const store = createInspectionStore();
  store.node({ id: 'root', kind: 'definition', label: 'Root' });
  store.node({ id: 'state', kind: 'state', label: 'Ready' });
  store.edge('root', 'state', 'defines');
  render(<ReactLayoutDevtoolsContent source={store} />);
  fireEvent.click(screen.getByRole('button', { name: /STATE.*Ready/i }));
  fireEvent.change(screen.getByLabelText('Search graph'), {
    target: { value: 'missing' },
  });
  fireEvent.click(
    within(
      screen.getByRole('navigation', { name: 'Selected node path' })
    ).getByRole('button', { name: 'Root' })
  );
  expect(screen.getByRole('heading', { name: 'Root' })).toBeTruthy();
});
