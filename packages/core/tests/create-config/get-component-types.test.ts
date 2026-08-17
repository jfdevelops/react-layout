import type { JSX } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { type ComponentTypes, defineResourceLayout } from '../../src';
import type {
  GetComponentAtBound,
  GetComponentForResourceBound,
  GetComponentOptions,
  GetComponentOptionsForResource,
  ResourceConfigComponents,
  ResourceConfigMap,
  ResourceFromGetComponentBound,
  SubResourceFromGetComponentBound,
  ValidateForResourceBound,
} from '../../src/create-config';
import type { SubResourceParamForResource } from '../../src/resource';

type TestResources = readonly [
  {
    readonly value: 'users';
    readonly subResources: readonly [
      { readonly value: 'admins'; readonly subResources: readonly ['members'] },
      {
        readonly value: 'managers';
        readonly subResources: readonly [
          {
            readonly value: 'male';
            readonly subResources: readonly ['wfh', 'onsite'];
          },
          'female',
        ];
      },
    ];
  },
  'groups',
  'roles',
];

type ResourceConfigComponentKey = keyof ResourceConfigComponents;

type UsersOptions = GetComponentOptionsForResource<TestResources, 'users'>;
type GroupsOptions = GetComponentOptionsForResource<TestResources, 'groups'>;
type AllOptions = GetComponentOptions<TestResources>;

type AssertRolesResource = 'roles' extends AllOptions['resource'] ? true : false;
type AssertUsersHasSubResource = 'subResource' extends keyof UsersOptions
  ? true
  : false;
type AssertGroupsNoSubResource = 'subResource' extends keyof GroupsOptions
  ? false
  : true;
type AssertFlatSlug = 'managers' extends NonNullable<UsersOptions['subResource']>
  ? true
  : false;
type AssertNestedSubResource = {
  value: 'managers';
  subResource: 'male';
} extends NonNullable<UsersOptions['subResource']>
  ? true
  : false;
type AssertComponentAllowsError = 'errorComponent' extends ResourceConfigComponentKey
  ? true
  : false;
type AssertComponentAllowsPending = 'pendingComponent' extends ResourceConfigComponentKey
  ? true
  : false;
type AssertComponentAllowsNew = 'new' extends ResourceConfigComponentKey ? true : false;
type AssertComponentAllowsDetail = 'detail' extends ResourceConfigComponentKey
  ? true
  : false;
type AssertUsersComponentKey = NonNullable<
  UsersOptions['component']
> extends ResourceConfigComponentKey
  ? true
  : false;
type AssertDefaultComponentOptional = undefined extends UsersOptions['component']
  ? true
  : false;

type ForResourceResult<
  Bound extends {
    resource: ResourceFromGetComponentBound<TestResources, Bound>;
  },
> = GetComponentAtBound<
  TestResources,
  ResourceFromGetComponentBound<
    TestResources,
    ValidateForResourceBound<TestResources, Bound>
  >,
  SubResourceFromGetComponentBound<
    ValidateForResourceBound<TestResources, Bound>
  >
>;

type InvalidGroupsSubResourceBound = ValidateForResourceBound<
  TestResources,
  {
    resource: 'groups';
    subResource: { value: 'managers'; subResource: 'female' };
  }
>;
type AssertGroupsSubResourceRejected = [
  InvalidGroupsSubResourceBound,
] extends [never]
  ? true
  : false;

type BoundFemale = GetComponentAtBound<
  TestResources,
  'users',
  { value: 'managers'; subResource: 'female' }
>;
type AssertBoundFemaleNoResource = 'resource' extends Parameters<BoundFemale>[0]
  ? false
  : true;
type AssertBoundFemaleComponent = NonNullable<
  Parameters<BoundFemale>[0]
>['component'] extends ResourceConfigComponentKey | undefined
  ? true
  : false;

type BoundUsers = GetComponentAtBound<TestResources, 'users'>;
type AssertBoundUsersNoSubResource = 'subResource' extends Parameters<BoundUsers>[0]
  ? false
  : true;

describe('getComponent options types', () => {
  it('allows every layout resource on resource, not only configured keys', () => {
    const includesRoles: AssertRolesResource = true;
    expect(includesRoles).toBe(true);
  });

  it('includes subResource only for resources with layout subResources', () => {
    const usersHasSubResource: AssertUsersHasSubResource = true;
    const groupsNoSubResource: AssertGroupsNoSubResource = true;
    expect(usersHasSubResource).toBe(true);
    expect(groupsNoSubResource).toBe(true);
  });

  it('allows flat and nested subResource values from the layout tree', () => {
    const flatSlug: AssertFlatSlug = true;
    const nested: AssertNestedSubResource = true;
    expect(flatSlug).toBe(true);
    expect(nested).toBe(true);
  });

  it('types component as keyof ResourceConfigComponents', () => {
    const allowsError: AssertComponentAllowsError = true;
    const allowsPending: AssertComponentAllowsPending = true;
    const allowsNew: AssertComponentAllowsNew = true;
    const allowsDetail: AssertComponentAllowsDetail = true;
    const usersComponentKey: AssertUsersComponentKey = true;
    const componentOptional: AssertDefaultComponentOptional = true;
    expect(allowsError).toBe(true);
    expect(allowsPending).toBe(true);
    expect(allowsNew).toBe(true);
    expect(allowsDetail).toBe(true);
    expect(usersComponentKey).toBe(true);
    expect(componentOptional).toBe(true);
  });

  it('supports deeply nested subResource without a path depth cap', () => {
    type DeepResources = readonly [
      {
        readonly value: 'users';
        readonly subResources: readonly [
          {
            readonly value: 'managers';
            readonly subResources: readonly [
              {
                readonly value: 'male';
                readonly subResources: readonly [
                  {
                    readonly value: 'wfh';
                    readonly subResources: readonly [
                      'domestic',
                      'international',
                    ];
                  },
                  'onsite',
                ];
              },
            ];
          },
        ];
      },
    ];
    type DeepUsersOptions = GetComponentOptionsForResource<
      DeepResources,
      'users'
    >;
    type AssertFourDeep = {
      value: 'managers';
      subResource: {
        value: 'male';
        subResource: {
          value: 'wfh';
          subResource: 'domestic';
        };
      };
    } extends NonNullable<DeepUsersOptions['subResource']>
      ? true
      : false;
    const fourDeep: AssertFourDeep = true;
    expect(fourDeep).toBe(true);
  });

  it('matches full-tree subResource param for a resource', () => {
    type Full = SubResourceParamForResource<TestResources, 'users'>;
    type AssertNested = { value: 'managers'; subResource: 'male' } extends Full
      ? true
      : false;
    const nested: AssertNested = true;
    expect(nested).toBe(true);
  });

  it('rejects subResource on resources without layout subResources', () => {
    const rejected: AssertGroupsSubResourceRejected = true;
    expect(rejected).toBe(true);
  });

  it('forResource narrows the returned getter to component only', () => {
    const noResource: AssertBoundFemaleNoResource = true;
    const hasComponent: AssertBoundFemaleComponent = true;
    const noSubResource: AssertBoundUsersNoSubResource = true;
    expect(noResource).toBe(true);
    expect(hasComponent).toBe(true);
    expect(noSubResource).toBe(true);
  });

  it('infers forResource binding from the bound argument', () => {
    type AssertInferred = ForResourceResult<{
      resource: 'users';
      subResource: { value: 'managers'; subResource: 'female' };
    }> extends GetComponentAtBound<
      TestResources,
      'users',
      { value: 'managers'; subResource: 'female' }
    >
      ? true
      : false;
    const inferred: AssertInferred = true;
    expect(inferred).toBe(true);
  });
});

type TemplateResources = readonly [
  {
    readonly value: 'templates';
    readonly subResources: readonly [
      {
        readonly value: 'deleted';
        readonly subResources: readonly ['expired'];
      },
    ];
  },
  'appointments',
];

describe('getComponent types for resource-specific sub-resources', () => {
  const { createResourceConfig } = defineResourceLayout({
    resources: [
      {
        value: 'templates',
        subResources: [
          {
            value: 'deleted',
            subResources: ['expired'],
          },
        ],
      },
      'appointments',
    ],
    layout: {
      render: () => null as never,
    },
  });

  const config = createResourceConfig({
    templates: {
      component: null as never,
      detail: { component: null as never },
      deleted: {
        component: null as never,
        errorComponent: null as never,
        expired: {
          component: null as never,
          pendingComponent: null as never,
        },
      },
    },
    appointments: {
      component: null as never,
    },
  });

  it('infers component types actually defined across the config', () => {
    expectTypeOf<ComponentTypes<typeof config>>().toEqualTypeOf<
      'component' | 'detail' | 'errorComponent' | 'pendingComponent'
    >();
  });

  it('keys sub-resources directly on the resource, with no subResources wrapper', () => {
    createResourceConfig({
      templates: {
        component: null as never,
        deleted: {
          component: null as never,
          expired: { component: null as never },
        },
      },
    });

    type TemplatesEntry = NonNullable<
      ResourceConfigMap<TemplateResources>['templates']
    >;
    type DeletedEntry = NonNullable<TemplatesEntry['deleted']>;
    type AppointmentsEntry = NonNullable<
      ResourceConfigMap<TemplateResources>['appointments']
    >;

    type AssertSubResourceIsDirectKey = 'deleted' extends keyof TemplatesEntry
      ? true
      : false;
    type AssertNoSubResourcesWrapper =
      'subResources' extends keyof TemplatesEntry ? false : true;
    type AssertNestedSubResourceIsDirectKey =
      'expired' extends keyof DeletedEntry ? true : false;
    type AssertSubResourceKeysAreResourceSpecific =
      'deleted' extends keyof AppointmentsEntry ? false : true;

    const directKey: AssertSubResourceIsDirectKey = true;
    const noWrapper: AssertNoSubResourcesWrapper = true;
    const nestedDirectKey: AssertNestedSubResourceIsDirectKey = true;
    const resourceSpecific: AssertSubResourceKeysAreResourceSpecific = true;
    expect(directKey).toBe(true);
    expect(noWrapper).toBe(true);
    expect(nestedDirectKey).toBe(true);
    expect(resourceSpecific).toBe(true);
  });

  it('accepts subResource only when declared for the selected resource', () => {
    expectTypeOf(config.getComponent).toBeCallableWith({
      resource: 'templates',
      subResource: 'deleted',
    });
    expectTypeOf(config.getComponent).toBeCallableWith({
      resource: 'templates',
      subResource: {
        value: 'deleted',
        subResource: 'expired',
      },
      component: 'pendingComponent',
    });
    expectTypeOf(config.getComponent).toBeCallableWith({
      resource: 'templates',
    });
    expectTypeOf(config.getComponent).toBeCallableWith({
      resource: 'templates',
      component: 'detail',
    });
  });

  it('keeps component limited to component slots', () => {
    () => {
      // @ts-expect-error deleted is a sub-resource, not a component slot
      config.getComponent({
        resource: 'templates',
        component: 'deleted',
      });
    };
  });

  it('rejects invalid sub-resources for the selected resource and depth', () => {
    () => {
      // @ts-expect-error archived is not a templates sub-resource
      config.getComponent({
        resource: 'templates',
        subResource: 'archived',
      });
    };
    () => {
      // @ts-expect-error archived is not nested under deleted
      config.getComponent({
        resource: 'templates',
        subResource: {
          value: 'deleted',
          subResource: 'archived',
        },
      });
    };
  });

  it('omits subResource for resources without declared sub-resources', () => {
    type AppointmentsOptions = GetComponentOptionsForResource<
      TemplateResources,
      'appointments'
    >;
    type AssertNoSubResourceOption =
      'subResource' extends keyof AppointmentsOptions ? false : true;

    const noSubResourceOption: AssertNoSubResourceOption = true;
    expect(noSubResourceOption).toBe(true);
  });

  it('supports deeply typed config paths', () => {
    expectTypeOf(config.getComponent).toBeCallableWith(
      'templates.deleted.expired',
    );
    expectTypeOf(config.getComponent).toBeCallableWith(
      'templates.deleted.expired.component',
    );
    expectTypeOf(config.getComponent).toBeCallableWith(
      'templates.deleted.expired.pendingComponent',
    );
    expectTypeOf(config.getComponent).toBeCallableWith(
      'appointments.component',
    );

    () => {
      // @ts-expect-error deleted is not configured under appointments
      config.getComponent('appointments.deleted.component');
    };
    () => {
      // @ts-expect-error archived is not configured under deleted
      config.getComponent('templates.deleted.archived.component');
    };
  });

  it('forResource binds a recursive sub-resource path and leaves component optional', () => {
    const getExpired = config.getComponent.forResource({
      resource: 'templates',
      subResource: {
        value: 'deleted',
        subResource: 'expired',
      },
    });

    expectTypeOf(getExpired).toBeCallableWith();
    expectTypeOf(getExpired).toBeCallableWith({
      component: 'pendingComponent',
    });

    () => {
      // @ts-expect-error resource is already bound
      getExpired({ resource: 'templates' });
    };
    () => {
      // @ts-expect-error subResource is already bound
      getExpired({ subResource: 'expired' });
    };
  });
});
