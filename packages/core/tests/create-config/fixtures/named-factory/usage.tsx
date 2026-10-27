import { expectTypeOf } from 'vitest';
import {
  createDefinedResourceLayout,
  defineLayoutName
} from '@jfdevelops/react-layout';
import { resources, defineResourceLayout, type Resource } from './base';
import { createResourceLayout, useResource } from './layout';

export const Appointments = createResourceLayout({
  resource: 'appointments',
  title: 'Appointments',
  description: 'Manage bookings',
  segments: { section: 'Calendar' }
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
  }
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
  }
});
export const Overridden = overriddenDefinition.createResourceLayout({
  resource: 'dashboard'
});

const unnamedFactory = createDefinedResourceLayout({
  resources: ['users']
});
const unnamedDefinition = unnamedFactory.defineResourceLayout({
  render: {
    default: () => <p>Generated layout</p>,
    Loading: () => <p>Loading generated layout</p>
  }
});
export const Generated = unnamedDefinition.createResourceLayout({
  resource: 'users'
});
expectTypeOf(Generated.displayName).toEqualTypeOf<'UsersLayout'>();
expectTypeOf(
  Generated.Loading.displayName
).toEqualTypeOf<'UsersLayout.Loading'>();
export const GeneratedScoped =
  unnamedDefinition.createResourceLayout.forResources('users')({
    resource: 'users'
  });
expectTypeOf(GeneratedScoped.displayName).toEqualTypeOf<'UsersLayout'>();
export const GeneratedBound =
  unnamedDefinition.createResourceLayout.forResource('users')();
expectTypeOf(GeneratedBound.displayName).toEqualTypeOf<'UsersLayout'>();
export const generatedNamespace = unnamedDefinition.createResourceLayout({
  resource: 'users',
  namespace: true
});
expectTypeOf(
  generatedNamespace.Root.displayName
).toEqualTypeOf<'UsersLayout'>();

const stringFactory = createDefinedResourceLayout({
  resources: ['users'],
  name: 'FactoryUsers'
});
const stringDefinition = stringFactory.defineResourceLayout({
  name: 'DefinitionUsers',
  render: () => <p>Named layout</p>
});
export const DefinitionNamed = stringDefinition.createResourceLayout({
  resource: 'users'
});
expectTypeOf(
  DefinitionNamed.displayName
).toEqualTypeOf<'DefinitionUsers'>();
export const ComponentNamed = stringDefinition.createResourceLayout({
  resource: 'users',
  name: 'ComponentUsers'
});
expectTypeOf(ComponentNamed.displayName).toEqualTypeOf<'ComponentUsers'>();
export const FactoryNamed = stringFactory
  .defineResourceLayout({ render: () => <p>Factory layout</p> })
  .createResourceLayout({ resource: 'users' });
expectTypeOf(FactoryNamed.displayName).toEqualTypeOf<'FactoryUsers'>();
const scopedFactoryNamed = stringFactory.defineResourceLayout({
  render: () => <></>
}).createResourceLayout;
export const FactoryScoped = scopedFactoryNamed.forResources('users')({
  resource: 'users'
});
expectTypeOf(FactoryScoped.displayName).toEqualTypeOf<'FactoryUsers'>();
export const FactoryBound = scopedFactoryNamed.forResource('users')();
expectTypeOf(FactoryBound.displayName).toEqualTypeOf<'FactoryUsers'>();

const placeholderName = defineLayoutName(
  ({ resource, capitalize }, parts) =>
    `${parts.prefix}${capitalize(resource)}${
      parts.beforeSuffix
    }${resource}${parts.append}${
      parts.prefix
    }__layout_prefix__LayoutCapitalizedResourceToken`
);
const placeholderFactory = createDefinedResourceLayout({
  resources: ['users'],
  name: placeholderName({
    prefix: '__layout_append__',
    beforeSuffix: 'Detail',
    append: 'Page'
  })
});
export const PlaceholderNamed = placeholderFactory
  .defineResourceLayout({
    render: () => <p>Placeholder layout</p>
  })
  .createResourceLayout({ resource: 'users' });
expectTypeOf(
  PlaceholderNamed.displayName
).toEqualTypeOf<'__layout_append__UsersDetailusersPage__layout_append____layout_prefix__LayoutCapitalizedResourceToken'>();

const typedNaming = defineLayoutName
  .defineParts({ section: 'string', version: 'number' })
  .namingFn(({ resource, capitalize }, parts) => {
    expectTypeOf(parts.section).toBeString();
    expectTypeOf(parts.version).toMatchTypeOf<number | ''>();
    expectTypeOf(parts.version).extract<''>().not.toBeNever();
    return `${parts.section}${capitalize(resource)}V${parts.version}`;
  });
const typedNamingDefinition = createDefinedResourceLayout({
  resources: ['users', 'settings'],
  name: typedNaming({ section: 'Admin', version: 2 })
}).defineResourceLayout({ render: () => <p>Typed naming parts</p> });
export const TypedParts = typedNamingDefinition.createResourceLayout({
  resource: 'users'
});
expectTypeOf(TypedParts.displayName).toEqualTypeOf<'AdminUsersV2'>();
export const CallbackParts = typedNamingDefinition.createResourceLayout({
  resource: 'settings',
  name: typedNaming(({ capitalize, resource }) => ({
    section: capitalize(resource),
    version: 0
  }))
});
expectTypeOf(
  CallbackParts.displayName
).toEqualTypeOf<'SettingsSettingsV0'>();
export const EmptyParts = typedNamingDefinition.createResourceLayout({
  resource: 'users',
  name: typedNaming()
});
expectTypeOf(EmptyParts.displayName).toEqualTypeOf<'UsersV'>();
const stringParts = defineLayoutName
  .defineParts('resource', 'suffix')
  .namingFn(
    ({ resource, capitalize }, parts) =>
      `${parts.resource}${capitalize(resource)}${parts.suffix}`
  );
export const StringParts = typedNamingDefinition.createResourceLayout({
  resource: 'users',
  name: stringParts({ resource: 'Admin', suffix: 'Page' })
});
expectTypeOf(StringParts.displayName).toEqualTypeOf<'AdminUsersPage'>();

const formattedNumberName = defineLayoutName
  .defineParts({ version: 'number' })
  .namingFn(({ resource, capitalize }, parts) => {
    const version =
      typeof parts.version === 'number' ? parts.version.toFixed(0) : '';
    return `${capitalize(resource)}V${version}`;
  });
const formattedNumberDefinition = createDefinedResourceLayout({
  resources: ['users'],
  name: formattedNumberName()
}).defineResourceLayout({
  render: () => <p>Optional numeric naming parts</p>
});
export const OmittedNumericPart =
  formattedNumberDefinition.createResourceLayout({ resource: 'users' });
export const ZeroNumericPart =
  formattedNumberDefinition.createResourceLayout({
    resource: 'users',
    name: formattedNumberName({ version: 0 })
  });
export const SuppliedNumericPart =
  formattedNumberDefinition.createResourceLayout({
    resource: 'users',
    name: formattedNumberName({ version: 2 })
  });

export function checkInvalidCalls() {
  defineLayoutName
    .defineParts({ version: 'number' })
    .namingFn((_context, parts) => {
      // @ts-expect-error optional numeric parts must be narrowed before using number methods
      return parts.version.toFixed(0);
    });

  // @ts-expect-error number parts reject strings
  typedNaming({ version: '2' });
  // @ts-expect-error string parts reject numbers
  typedNaming({ section: 2 });
  // @ts-expect-error only declared parts may be supplied
  typedNaming({ section: 'Admin', typo: 'wrong' });
  // @ts-expect-error callbacks may only return declared parts
  typedNaming(() => ({ section: 'Admin', typo: 'wrong' }));
  // @ts-expect-error callback parts must match the schema
  typedNaming(() => ({ version: '2' }));
  // @ts-expect-error spread-defined parts accept strings
  stringParts({ suffix: 2 });
  // @ts-expect-error unsupported part descriptors are rejected
  defineLayoutName.defineParts({ enabled: 'boolean' });
  defineLayoutName.defineParts('section').namingFn((_context, parts) => {
    // @ts-expect-error undeclared parts are unavailable in the pattern
    return `${parts.missing}`;
  });

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
  createResourceLayout({
    resource: 'appointments',
    // @ts-expect-error config props preserve their declared ReactNode schema
    title: { invalid: true }
  });
  // @ts-expect-error required config props stay required through state reuse
  createResourceLayout({ resource: 'appointments' });
  createResourceLayout({
    resource: 'appointments',
    title: 'Appointments',
    // @ts-expect-error creation defaults retain the breadcrumb schema
    segments: { section: 123 }
  });
  const unnamed = createDefinedResourceLayout({ resources: ['users'] });
  const definition = unnamed.defineResourceLayout({ render: () => <></> });
  const Users = definition.createResourceLayout({ resource: 'users' });
  expectTypeOf(Users.displayName).toEqualTypeOf<'UsersLayout'>();
  // @ts-expect-error naming callbacks must return strings
  createDefinedResourceLayout({ resources: ['users'], name: () => 123 });
  createDefinedResourceLayout({
    resources: ['users'],
    // @ts-expect-error naming contexts must not accept arbitrary properties
    name: ({ missing }) => missing
  });
}
