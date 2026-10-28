import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { InspectionDetails } from '../src/inspection-details';
import { resolveChipColors } from '../src/config';

function fixture() {
  const required = Object.assign(vi.fn(), {
    _baseProp: { type: 'ReactNode', visibility: 'required' },
  });
  const optional = Object.assign(vi.fn(), {
    _baseProp: { type: 'string', visibility: 'optional' },
  });
  const details = {
    resource: 'users',
    propSchemas: { title: optional },
    props: {
      include: {
        title: true,
        segments: { required: false, suppliedVia: 'component' },
        action: { required: true, suppliedVia: 'component' },
        description: 'optional',
      },
      custom: { children: required, className: optional },
    },
  };
  return { required, optional, details };
}
it('lists readable prop contracts with configurable chips and shared accessible tooltips', async () => {
  const { required, optional, details } = fixture();
  render(
    <InspectionDetails
      details={details}
      palette={resolveChipColors({
        required: { color: 'red', background: 'pink' },
        included: 'cyan',
        component: 'lime',
      })}
    />
  );
  const rows = within(
    screen.getByRole('list', { name: 'Prop list' })
  ).getAllByRole('listitem');
  expect(rows).toHaveLength(6);
  const title = within(rows[0]);
  // The include contract overrides the schema's optional visibility.
  expect(title.getByText('required').style.color).toBe('red');
  expect(title.getByText('string').style.background).toBe('pink');
  expect(title.getByText('included').style.color).toBe('cyan');
  expect(title.getByText('config')).toBeTruthy();
  expect(title.queryByText('component')).toBeNull();
  expect(within(rows[1]).getByText('component').style.color).toBe('lime');
  expect(within(rows[1]).getByText('config')).toBeTruthy();
  expect(within(rows[2]).queryByText('config')).toBeNull();
  expect(within(rows[3]).getByText('component')).toBeTruthy();
  expect(within(rows[3]).getByText('config')).toBeTruthy();
  fireEvent.focus(within(rows[1]).getByText('component'));
  expect((await screen.findByRole('tooltip')).textContent).toContain(
    'supply this value on the rendered layout component'
  );
  fireEvent.keyDown(within(rows[1]).getByText('component'), { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(required).not.toHaveBeenCalled();
  expect(optional).not.toHaveBeenCalled();
});
it('combines search, kind, and requirement filters and explains empty results', () => {
  render(
    <InspectionDetails
      details={fixture().details}
      palette={resolveChipColors(undefined)}
    />
  );
  const list = screen.getByRole('list', { name: 'Prop list' });
  fireEvent.change(screen.getByLabelText('Filter prop kind'), {
    target: { value: 'custom' },
  });
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Filter prop requirement'), {
    target: { value: 'optional' },
  });
  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  expect(within(list).getByText('className')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Filter props'), {
    target: { value: 'string' },
  });
  expect(within(list).getByText('className')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Filter props'), {
    target: { value: 'missing' },
  });
  expect(screen.getByText('No props match these filters.')).toBeTruthy();
});
it('handles empty contracts and safe non-prop descriptions', () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  render(
    <InspectionDetails
      details={{ props: {}, resource: 'users', metadata: cycle }}
      palette={resolveChipColors(undefined)}
    />
  );
  expect(screen.getByText('No props declared for this node.')).toBeTruthy();
  expect(screen.getByText('users')).toBeTruthy();
  expect(screen.getByText(/circular reference/)).toBeTruthy();
  expect(screen.queryByLabelText('Filter props')).toBeNull();
});

it('filters by available prop types alongside the other filters', () => {
  const { details } = fixture();

  render(
    <InspectionDetails
      details={details}
      palette={resolveChipColors(undefined)}
    />
  );

  const list = screen.getByRole('list', { name: 'Prop list' });
  const types = screen.getByLabelText('Filter prop type');

  expect(within(types).getByRole('option', { name: 'ReactNode' })).toBeTruthy();
  expect(within(types).getByRole('option', { name: 'string' })).toBeTruthy();
  expect(within(types).getByRole('option', { name: 'Unknown' })).toBeTruthy();

  fireEvent.change(types, { target: { value: 'ReactNode' } });

  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  expect(within(list).getByText('children')).toBeTruthy();

  fireEvent.change(types, { target: { value: 'string' } });
  fireEvent.change(screen.getByLabelText('Filter prop kind'), {
    target: { value: 'custom' },
  });

  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  expect(within(list).getByText('className')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Filter prop requirement'), {
    target: { value: 'required' },
  });

  expect(screen.getByText('No props match these filters.')).toBeTruthy();
});
