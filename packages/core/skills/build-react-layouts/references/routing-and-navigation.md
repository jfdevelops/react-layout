# Routing and Navigation

## Contents

- Grouped resource links
- Resource configuration
- Route dispatch
- Runtime route validation
- Async route states
- Separation of concerns

## Generate grouped resource links

Generate navigation from the layout's resource vocabulary:

```tsx
const navigation = createResourceLinks.withGroups([
  {
    links: {
      dashboard: {
        label: 'Dashboard',
        icon: <DashboardIcon />,
        href: '/admin',
      },
      appointments: {
        label: 'Appointments',
        icon: <AppointmentsIcon />,
      },
    },
  },
  {
    label: 'Configuration',
    links: {
      settings: {
        label: 'Settings',
        icon: <SettingsIcon />,
      },
    },
  },
]);
```

Use groups to express information architecture. Let normal resources use the
shared resource route. Provide `href` only for special destinations whose route
does not follow the general pattern.

Render links using the generated `resource` value instead of reconstructing it
from labels.

## Create the resource configuration

Create a typed configuration that maps each routeable resource to its normal
and asynchronous states:

```tsx
export const resourcePageConfig = createResourceConfig({
  appointments: {
    component: <AppointmentsPage />,
    pendingComponent: (
      <AppointmentsPage>
        <AppointmentsPage.Loading />
      </AppointmentsPage>
    ),
    errorComponent: (
      <AppointmentsPage>
        <AppointmentsPage.Error />
      </AppointmentsPage>
    ),
    notFoundComponent: (
      <AppointmentsPage>
        <AppointmentsPage.NotFound />
      </AppointmentsPage>
    ),
  },
  locations: {
    component: <Locations />,
    pendingComponent: <LocationsLoading />,
    errorComponent: <LocationsError />,
    notFoundComponent: <LocationsNotFound />,
    detail: {
      component: <LocationDetail />,
      pendingComponent: <LocationDetailLoading />,
      errorComponent: <LocationDetailError />,
      notFoundComponent: <LocationDetailNotFound />,
    },
  },
});
```

Keep this mapping declarative. Keep data fetching and mutation logic inside the
corresponding feature components or router loaders.

## Dispatch route components generically

Use one generic route adapter to select the configured component:

```tsx
type ResourceComponentKey =
  | 'component'
  | 'pendingComponent'
  | 'errorComponent'
  | 'notFoundComponent';

function getResourceComponent(component: ResourceComponentKey) {
  const resource = Route.useParams({
    select: ({ resource }) => resource,
  });

  return resourcePageConfig.getComponent.forResource({
    resource,
  })({
    component,
  });
}

function RouteComponent() {
  return getResourceComponent('component');
}

function PendingComponent() {
  return getResourceComponent('pendingComponent');
}
```

Use the same mechanism for error and not-found states. Do not create resource
condition chains in the generic route component when the information belongs
in `createResourceConfig`.

## Validate route parameters at runtime

The layout provides compile-time resource constraints. The router must still
validate untrusted URL parameters at runtime.

Parse or validate the route parameter before passing it to generated resource
helpers. Reject invalid resources through the router's normal not-found
mechanism. Keep routing validation in the router layer instead of embedding it
in the shared layout renderer.

## Preserve the layout during async states

Wrap pending, error, and not-found content in the same generated page shell
when the shell should remain visible during those states.

Use a separate route-state surface when a detail view cannot render its normal
page structure without loaded data. Keep the mapping explicit so one resource's
state cannot appear inside another resource's layout.

## Keep ownership clear

Let the layout layer own:

- Valid resource vocabulary
- Shared application structure
- Page configuration contracts
- Semantic composition points
- Navigation metadata
- Resource-to-component dispatch

Let the router own:

- URL parsing
- Search parameter validation
- Redirects
- Loaders
- Route lifecycle selection
- Runtime not-found behavior

Let feature components own:

- Queries and mutations
- Feature-level loading details
- Tables and calendars
- Forms
- Resource-specific interactions
