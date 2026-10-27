import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  Appointments,
  TypedParts,
  OmittedNumericPart,
  ZeroNumericPart,
  SuppliedNumericPart,
  CallbackParts,
  EmptyParts,
  StringParts,
  Generated,
  PlaceholderNamed,
  GeneratedScoped,
  GeneratedBound,
  generatedNamespace,
  DefinitionNamed,
  ComponentNamed,
  FactoryNamed,
  FactoryScoped,
  FactoryBound,
  Dashboard,
  ErrorState,
  NamedState,
  Overridden,
  Page
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
  expect(Appointments.Layout.displayName).toBe(
    'AppointmentsLayout.Layout'
  );
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

it('derives a resource name when no naming default is supplied', () => {
  expect(Generated.displayName).toBe('UsersLayout');
  render(<Generated />);
  expect(screen.getByText('Generated layout')).toBeInTheDocument();
});

it('inherits naming defaults before deriving resource names across builders and namespaces', () => {
  expect(GeneratedScoped.displayName).toBe('UsersLayout');
  expect(GeneratedBound.displayName).toBe('UsersLayout');
  expect(generatedNamespace.Root.displayName).toBe('UsersLayout');
  expect(Generated.Loading.displayName).toBe('UsersLayout.Loading');
  expect(generatedNamespace.Loading.displayName).toBe(
    'UsersLayout.Loading'
  );
  expect(FactoryNamed.displayName).toBe('FactoryUsers');
  expect(FactoryScoped.displayName).toBe('FactoryUsers');
  expect(FactoryBound.displayName).toBe('FactoryUsers');
  expect(DefinitionNamed.displayName).toBe('DefinitionUsers');
  expect(ComponentNamed.displayName).toBe('ComponentUsers');
});

it('keeps literal text and supplied values separate from naming placeholders', () => {
  expect(PlaceholderNamed.displayName).toBe(
    '__layout_append__UsersDetailusersPage__layout_append____layout_prefix__LayoutCapitalizedResourceToken'
  );
});

it('resolves declared string and number parts with literal names and optional values', () => {
  expect(TypedParts.displayName).toBe('AdminUsersV2');
  expect(CallbackParts.displayName).toBe('SettingsSettingsV0');
  expect(EmptyParts.displayName).toBe('UsersV');
  expect(StringParts.displayName).toBe('AdminUsersPage');
  render(<TypedParts />);
  expect(screen.getByText('Typed naming parts')).toBeInTheDocument();
});

it('narrows optional numeric parts before formatting omitted, zero, and supplied values', () => {
  expect(OmittedNumericPart.displayName).toBe('UsersV');
  expect(ZeroNumericPart.displayName).toBe('UsersV0');
  expect(SuppliedNumericPart.displayName).toBe('UsersV2');
  render(<OmittedNumericPart />);
  expect(
    screen.getByText('Optional numeric naming parts')
  ).toBeInTheDocument();
});
