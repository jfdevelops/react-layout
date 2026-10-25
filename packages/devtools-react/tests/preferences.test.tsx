import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import { ReactLayoutDevtoolsContent, ReactLayoutDevtools } from '../src';
import { defaultStorageKey } from '../src/preferences';

it('restores panel preferences and treats saved values as authoritative over props', () => {
  const source = createInspectionStore();
  const first = render(
    <ReactLayoutDevtoolsContent
      source={source}
      config={{ chipColors: { active: 'lime' } }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  fireEvent.click(screen.getByLabelText('Composables'));
  fireEvent.click(screen.getByLabelText('Active only'));
  fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));
  first.unmount();
  render(
    <ReactLayoutDevtoolsContent
      source={source}
      config={{ initialView: 'graph', initialFilters: { activeOnly: false } }}
    />
  );
  expect(screen.getByRole('tab', { name: 'Tree' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getByLabelText('Composables')).toBeChecked();
  expect(screen.getByLabelText('Active only')).toBeChecked();
  const saved = JSON.parse(localStorage.getItem(defaultStorageKey)!);
  expect(saved.initialZoom).toBe(1.25);
  expect(saved.chipColors.active).toBe('lime');
});
it('synchronizes inspectors in the same tab and reacts to cross-tab storage events', () => {
  render(
    <>
      <ReactLayoutDevtoolsContent source={createInspectionStore()} />
      <ReactLayoutDevtoolsContent source={createInspectionStore()} />
    </>
  );
  fireEvent.click(screen.getAllByRole('tab', { name: 'Tree' })[0]);
  expect(
    screen
      .getAllByRole('tab', { name: 'Tree' })
      .every((tab) => tab.getAttribute('aria-selected') === 'true')
  ).toBe(true);
  act(() => {
    localStorage.setItem(
      defaultStorageKey,
      JSON.stringify({ initialView: 'graph', initialZoom: 1.5 })
    );
    window.dispatchEvent(
      new StorageEvent('storage', { key: defaultStorageKey })
    );
  });
  expect(
    screen
      .getAllByRole('tab', { name: 'Graph' })
      .every((tab) => tab.getAttribute('aria-selected') === 'true')
  ).toBe(true);
  expect(
    screen
      .getAllByRole('button', { name: 'Reset zoom' })
      .every((button) => button.textContent === '150%')
  ).toBe(true);
});
it('handles invalid or unavailable storage and lets callers isolate preferences', () => {
  localStorage.setItem('invalid', '{broken');
  const first = render(
    <ReactLayoutDevtoolsContent
      source={createInspectionStore()}
      storageKey="invalid"
      config={{ initialView: 'tree' }}
    />
  );
  expect(screen.getByRole('tab', { name: 'Tree' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  first.unmount();
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
  try {
    render(
      <ReactLayoutDevtoolsContent
        source={createInspectionStore()}
        storageKey="blocked-write"
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));
    expect(screen.getByRole('tab', { name: 'Tree' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  } finally {
    write.mockRestore();
  }
});

it('restores the dragged FAB location across remounts', () => {
  localStorage.setItem(
    'fab-preferences',
    JSON.stringify({ fabPosition: { x: 120, y: 160 } })
  );
  const first = render(
    <ReactLayoutDevtools
      source={createInspectionStore()}
      storageKey="fab-preferences"
    />
  );
  const button = screen.getByRole('button', {
    name: 'Open React Layout Devtools',
  });
  expect(button).toHaveStyle({ left: '120px', top: '160px' });
  fireEvent.keyDown(button, { key: 'ArrowRight', altKey: true });
  expect(button).toHaveStyle({ left: '130px', top: '160px' });
  first.unmount();
  render(
    <ReactLayoutDevtools
      source={createInspectionStore()}
      storageKey="fab-preferences"
    />
  );
  expect(
    screen.getByRole('button', { name: 'Open React Layout Devtools' })
  ).toHaveStyle({ left: '130px', top: '160px' });
});
