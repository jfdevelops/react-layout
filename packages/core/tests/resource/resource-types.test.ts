import { describe, expect, it } from 'vitest';
import type {
  GetSubResourceKeys,
  LayoutResourceKey,
  SubResourceParamForResource,
} from '../../src/resource';

type TestResources = readonly [
  {
    readonly value: 'users';
    readonly subResources: readonly [
      { readonly value: 'admins'; readonly subResources: readonly ['members'] },
      { readonly value: 'managers'; readonly subResources: readonly ['male', 'female'] },
    ];
  },
  'groups',
];

type _TopLevelKeys = LayoutResourceKey<TestResources>;
type _AssertTopLevelKeys = 'users' | 'groups' extends _TopLevelKeys
  ? _TopLevelKeys extends 'users' | 'groups'
    ? true
    : false
  : false;

type _UserSubKeys = GetSubResourceKeys<TestResources, 'users'>;
type _AssertUserSubKeys = 'admins' | 'managers' extends _UserSubKeys
  ? _UserSubKeys extends 'admins' | 'managers'
    ? true
    : false
  : false;

type _UserSubParam = SubResourceParamForResource<TestResources, 'users'>;
type _AssertNestedSubParam = { resource: 'admins'; subResource: 'members' } extends _UserSubParam
  ? true
  : false;

describe('resource types', () => {
  it('infers layout resource and sub-resource keys', () => {
    const topLevelKeys: _AssertTopLevelKeys = true;
    const userSubKeys: _AssertUserSubKeys = true;
    const nestedSubParam: _AssertNestedSubParam = true;
    expect(topLevelKeys).toBe(true);
    expect(userSubKeys).toBe(true);
    expect(nestedSubParam).toBe(true);
  });
});
