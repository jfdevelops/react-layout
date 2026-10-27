import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  Appointments,
  Dashboard,
  ErrorState,
  NamedState,
  Overridden,
  Page,
} from './fixtures/named-factory/usage';

afterEach(cleanup);

it('renders a named factory through imported states and reused state props', () => {
  render(Page);
  expect(Appointments.displayName).toBe('AppointmentsLayout');
  expect(
    screen.getByRole('heading', { name: 'Appointments' })
  ).toBeInTheDocument();
  expect(screen.getByRole('navigation')).toHaveTextContent('Calendar');
  expect(
    screen.getByRole('button', { name: 'Add appointment' })
  ).toBeInTheDocument();
  expect(screen.getByText('Bookings')).toBeInTheDocument();
});

it('keeps imported compound states, preset overrides, and required custom props', () => {
  const view = render(NamedState);
  expect(Appointments.Layout.displayName).toBe('AppointmentsLayout.Layout');
  expect(screen.getByRole('navigation')).toHaveTextContent('Upcoming');
  expect(screen.getByText('Upcoming bookings')).toBeInTheDocument();
  view.rerender(ErrorState);
  expect(
    screen.getByText('Appointments: Unable to load bookings')
  ).toBeInTheDocument();
});

it('allows definition and component naming callbacks to override the factory', () => {
  expect(Dashboard.displayName).toBe('DashboardPage');
  expect(Overridden.displayName).toBe('DashboardOverride');
  render(<Overridden segments={{ page: 'Dashboard' }} />);
  expect(screen.getByRole('navigation')).toHaveTextContent('Dashboard');
});
