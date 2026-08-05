# Factory Patterns

## Contents

- Direct creation
- Resource-scoped factories
- Composable detail pages
- Multi-resource subsets
- Higher-order multi-resource components
- Selection guide

## Create one page directly

Use direct creation for one isolated page:

```tsx
export const WaitlistPage = createResourceLayout({
  resource: 'waitlist',
  name: 'WaitlistPage',
  segments: {
    title: 'Waitlist',
  },
});
```

Provide an explicit `name` when the surrounding factory does not establish one.

## Scope a factory to one resource

Use `forResource` when multiple page definitions share one resource:

```tsx
const createLocationsPage = createResourceLayout.forResource({
  resource: 'locations',
});

export const LocationsPage = createLocationsPage({
  segments: {
    title: 'Locations',
  },
});
```

Keep the scoped factory private unless several modules genuinely need it.

## Make a generated page composable

Use `makeComposable` when a page needs to retain the resource layout contract
while allowing consumers to address or rearrange semantic regions:

```tsx
export const LocationsDetailPage = LocationsPage.makeComposable({
  name: 'LocationsDetailPage',
});
```

Prefer this over copying the parent layout or manually reproducing its header
and content structure. Do not call `makeComposable` when consumers only need to
pass `children` or other declared custom props.

## Narrow a factory to several resources

Use `forResources` when a shared implementation applies to a known subset:

```tsx
const createCalendarPane =
  resourcePaneLayout.createResourceLayout.forResources('create', 'detail');

export const createCalendarDetailPane = createCalendarPane.forResource({
  resource: 'detail',
});

export const createCalendarCreatePane = createCalendarPane.forResource({
  resource: 'create',
});
```

Narrow the resource set before creating the final resource-specific factory.

## Create a higher-order multi-resource component

Use the advanced component factory when several resources share behavior but
need distinct render implementations:

```tsx
const createCalendarPage = createResourceLayout
  .forResources('appointments', 'availability');

const appointments = createCalendarPage.createResourceComponents({
  resource: 'appointments',
  props: {
    defined: { segments: { title: 'Appointments' } },
  },
  render: function AppointmentsRender() {
    return <AppointmentsView />;
  },
});

const availability = createCalendarPage.createResourceComponents({
  resource: 'availability',
  props: {
    defined: { segments: { title: 'Availability' } },
  },
  render: function AvailabilityRender() {
    return <AvailabilityView />;
  },
});

const createCalendarResourcePage = createCalendarPage
  .createComponent({
    resources: {
      appointments,
      availability,
    },
    render: function Render({ resource, children }, context) {
      return (
        <context.Root>
          {children ??
            (resource === 'appointments' ? (
              <context.Appointments />
            ) : (
              <context.Availability />
            ))}
        </context.Root>
      );
    },
  })
  .asHOF();

export const AppointmentsPage = createCalendarResourcePage('appointments');
export const AvailabilityPage = createCalendarResourcePage('availability');

<AppointmentsPage />;
<AppointmentsPage segments={{ title: 'Override' }} />;
<AvailabilityPage />;
```

Resource entries use one optional `props` bag: `include` exposes layout props
without defaults, `custom` declares additional props, and `defined` bakes
values into that resource. Every `defined` key is included automatically and
becomes optional at the bound call site. When a caller supplies the same prop,
the call-site value wins. Keep layout values inside `props.defined`, not beside
`render` on the entry.

Use this pattern only when the resources share meaningful behavior, controls,
or state transitions. The outer renderer should own behavior shared by the
resource subset. Each resource renderer should own resource-specific data and
content.

Attach closely related states when that creates a useful page namespace:

```tsx
export const AppointmentsPage = Object.assign(
  createCalendarPage('appointments'),
  {
    Loading: AppointmentsLoading,
    Error: AppointmentsError,
    NotFound: AppointmentsNotFound,
  },
);
```

Use this for components that are semantically part of the generated page
surface. Avoid turning the page component into an unrelated utility namespace.

## Choose the narrowest factory

- For one page, call `createResourceLayout`.
- For several pages belonging to one resource, use `forResource`.
- For several resources with the same configuration shape, use `forResources`.
- When consumers need semantic subcomponents, use `makeComposable`.
- When several resources share an outer behavior but need distinct
  implementations, use `createComponent(...).asHOF()`.
- When the surface has a different structural contract, create another
  `defineResourceLayout`.
