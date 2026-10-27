import { expectTypeOf } from 'vitest';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';
import { resources, defineResourceLayout, type Resource } from './base';
import { createResourceLayout, useResource } from './layout';

export const Appointments = createResourceLayout({
  resource: 'appointments',
  title: 'Appointments',
  description: 'Manage bookings',
  segments: { section: 'Calendar' },
});
export const Page = (
  <Appointments actions={<button>Add appointment</button>} showHeader>
    <p>Bookings</p>
  </Appointments>
);
export const NamedState = (
  <Appointments.Layout
    segments={{ section: { value: 'Upcoming', isActive: true } }}
  >
    <p>Upcoming bookings</p>
  </Appointments.Layout>
);
export const ErrorState = (
  <Appointments.Error error="Unable to load bookings" />
);

expectTypeOf(useResource).returns.toEqualTypeOf<Resource>();
expectTypeOf(resources.isResource).guards.toEqualTypeOf<Resource>();
expectTypeOf(Appointments.displayName).not.toBeAny();
expectTypeOf(Appointments.displayName).toBeString();
expectTypeOf<typeof Appointments.Layout.props.showHeader>().toEqualTypeOf<
  boolean | undefined
>();

export const Dashboard = createResourceLayout({
  resource: 'dashboard',
  title: 'Dashboard',
  name: ({ resource, capitalize, states }) => {
    expectTypeOf(resource).toEqualTypeOf<'dashboard'>();
    expectTypeOf(states).toEqualTypeOf<
      readonly ('default' | 'Layout' | 'Error')[]
    >();
    return `${capitalize(resource)}Page`;
  },
});
expectTypeOf(Dashboard.displayName).toEqualTypeOf<'DashboardPage'>();

export const overriddenDefinition = defineResourceLayout({
  name: ({ resource, capitalize }) => {
    expectTypeOf(resource).toEqualTypeOf<Resource>();
    return `${capitalize(resource)}Override`;
  },
  render: ({ segments }, { composables }) => {
    expectTypeOf(segments).toEqualTypeOf<
      import('./base').Segments | undefined
    >();
    return <composables.Breadcrumb segments={segments ?? {}} />;
  },
});
export const Overridden = overriddenDefinition.createResourceLayout({
  resource: 'dashboard',
});

export function checkInvalidCalls() {
  // @ts-expect-error final component props still require children
  <Appointments />;
  // @ts-expect-error final component props retain their optional boolean type
  <Appointments showHeader="yes">Bookings</Appointments>;
  // @ts-expect-error segment records must not accept arbitrary values
  <Appointments segments={{ section: 123 }}>Bookings</Appointments>;
  // @ts-expect-error named states preserve required children
  <Appointments.Layout />;
  // @ts-expect-error named states preserve the packaged breadcrumb value type
  <Appointments.Layout segments={{ section: false }}>
    Bookings
  </Appointments.Layout>;
  // @ts-expect-error error state custom props are required
  <Appointments.Error />;
  // @ts-expect-error error state custom props preserve their string schema
  <Appointments.Error error={123} />;
  // @ts-expect-error unknown compound states are rejected
  <Appointments.Missing />;
  // @ts-expect-error resource keys stay narrowed through the factory
  createResourceLayout({ resource: 'missing', title: 'Missing' });
  // @ts-expect-error config props preserve their declared ReactNode schema
  createResourceLayout({ resource: 'appointments', title: { invalid: true } });
  // @ts-expect-error required config props stay required through state reuse
  createResourceLayout({ resource: 'appointments' });
  createResourceLayout({
    resource: 'appointments',
    title: 'Appointments',
    // @ts-expect-error creation defaults retain the breadcrumb schema
    segments: { section: 123 },
  });
  const unnamed = createDefinedResourceLayout({ resources: ['users'] });
  const definition = unnamed.defineResourceLayout({ render: () => <></> });
  // @ts-expect-error factories without naming defaults still require a component name
  definition.createResourceLayout({ resource: 'users' });
  // @ts-expect-error naming callbacks must return strings
  createDefinedResourceLayout({ resources: ['users'], name: () => 123 });
  createDefinedResourceLayout({
    resources: ['users'],
    // @ts-expect-error naming contexts must not accept arbitrary properties
    name: ({ missing }) => missing,
  });
}
