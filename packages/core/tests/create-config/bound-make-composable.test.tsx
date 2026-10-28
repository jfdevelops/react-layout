import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, expectTypeOf, it } from 'vitest';
import { createComposableComponent, defineResourceLayout } from '../../src';

afterEach(cleanup);

function composableScope() {
  const definition = defineResourceLayout({
    resources: ['availability', 'appointments'],
    layout: {
      composables: () => ({
        Layout: createComposableComponent({ name: 'Layout' }),
        Header: createComposableComponent({ name: 'Header' }),
        Breadcrumb: createComposableComponent({ name: 'Breadcrumb' }),
        Content: createComposableComponent({ name: 'Content' }),
      }),
      render: () => <section />,
    },
  });
  const scope = definition.createResourceLayout.forResources({
    resources: ['availability', 'appointments'],
    name: {
      availability: 'AvailabilityPage',
      appointments: 'AppointmentsPage',
    },
  });
  const Calendar = scope.createComponent({ render: () => <section /> });
  return { definition, scope, Calendar };
}

it('exposes the same typed, renderable parts as a directly created resource layout', () => {
  const { definition, Calendar } = composableScope();
  const Availability = Calendar.asHOF()('availability');
  const Detail = Availability.makeComposable({
    name: 'AvailabilityDetailPage',
  });
  const Direct = definition.createResourceLayout({
    resource: 'availability',
    name: 'AvailabilityPage',
  }).makeComposable({ name: 'AvailabilityDetailPage' });

  expect(Detail.displayName).toBe('AvailabilityDetailPage');
  expectTypeOf(Detail.Header).toEqualTypeOf<typeof Direct.Header>();
  expectTypeOf(Detail.Breadcrumb).toEqualTypeOf<typeof Direct.Breadcrumb>();
  expectTypeOf(Detail.Content).toEqualTypeOf<typeof Direct.Content>();
  const bound = render(
    <Detail>
      <Detail.Header>Availability header</Detail.Header>
      <Detail.Breadcrumb>Availability breadcrumb</Detail.Breadcrumb>
      <Detail.Content>Availability content</Detail.Content>
    </Detail>,
  );
  const output = bound.container.innerHTML;
  cleanup();
  const direct = render(
    <Direct>
      <Direct.Header>Availability header</Direct.Header>
      <Direct.Breadcrumb>Availability breadcrumb</Direct.Breadcrumb>
      <Direct.Content>Availability content</Direct.Content>
    </Direct>,
  );
  expect(direct.container.innerHTML).toBe(output);
  expect(direct.container).toHaveTextContent('Availability header');
  expect(direct.container).toHaveTextContent('Availability breadcrumb');
  expect(direct.container).toHaveTextContent('Availability content');
  () => {
    Availability.makeComposable({
      name: 'WrongResource',
      // @ts-expect-error the HOF binding supplies resource
      resource: 'appointments',
    });
  };
});

it('preserves the bound component and helper identity and uses per-resource default names', () => {
  const { Calendar } = composableScope();
  const createCalendar = Calendar.asHOF();
  const Availability = createCalendar('availability');
  expect(createCalendar('availability')).toBe(Availability);
  expect(Calendar.asHOF()('availability')).toBe(Availability);
  expect(createCalendar('availability').makeComposable).toBe(
    Availability.makeComposable,
  );
  expect(Availability.makeComposable().displayName).toBe('AvailabilityPage');
  expect(Availability.makeComposable({}).displayName).toBe('AvailabilityPage');
  const Appointments = createCalendar('appointments');
  expect(Appointments).not.toBe(Availability);
  expect(Appointments.makeComposable().displayName).toBe('AppointmentsPage');
  expect(Availability.makeComposable().displayName).toBe('AvailabilityPage');
});

it('does not attach makeComposable when no composables are configured', () => {
  const definition = defineResourceLayout({
    resources: ['availability'],
    layout: { render: () => <section /> },
  });
  const Calendar = definition.createResourceLayout
    .forResources('availability')
    .createComponent({ render: () => <section /> });
  const Availability = Calendar.asHOF()('availability');
  expect(Availability.makeComposable).toBeUndefined();
  expect(Object.hasOwn(Availability, 'makeComposable')).toBe(false);
  expectTypeOf(Availability.makeComposable).toEqualTypeOf<undefined>();
  () => {
    // @ts-expect-error a layout without composables has no callable helper
    Availability.makeComposable({ name: 'Unavailable' });
  };
});
