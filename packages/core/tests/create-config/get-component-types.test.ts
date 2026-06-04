import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import type {
  GetComponentOptions,
  GetComponentOptionsForResource,
  ResourceConfigComponents,
} from '../../src/create-config';
import type { SubResourceParamForResource } from '../../src/resource';

type TestResources = readonly [
  {
    readonly value: 'users';
    readonly subResources: readonly [
      { readonly value: 'admins'; readonly subResources: readonly ['members'] },
      { readonly value: 'managers'; readonly subResources: readonly ['male', 'female'] },
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
  resource: 'managers';
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
                readonly subResources: readonly ['wfh', 'onsite'];
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
    type AssertThreeDeep = {
      resource: 'managers';
      subResource: { resource: 'male'; subResource: 'wfh' };
    } extends NonNullable<DeepUsersOptions['subResource']>
      ? true
      : false;
    const threeDeep: AssertThreeDeep = true;
    expect(threeDeep).toBe(true);
  });

  it('matches full-tree subResource param for a resource', () => {
    type Full = SubResourceParamForResource<TestResources, 'users'>;
    type AssertNested = { resource: 'managers'; subResource: 'male' } extends Full
      ? true
      : false;
    const nested: AssertNested = true;
    expect(nested).toBe(true);
  });
});
