import { describe, expect, it } from 'vitest';
import { normalizeResource, normalizeResources } from '../../src';

describe('resource helpers', () => {
  it('normalizes single and nested resources', () => {
    expect(normalizeResource('users')).toEqual({
      users: {
        subResources: {},
      },
    });

    expect(
      normalizeResource({
        value: 'users',
        subResources: ['admins', 'managers'],
      }),
    ).toEqual({
      users: {
        subResources: {
          admins: {
            subResources: {},
          },
          managers: {
            subResources: {},
          },
        },
      },
    });
  });

  it('normalizes multiple resources', () => {
    expect(normalizeResources(['users', 'groups'])).toEqual({
      users: {
        subResources: {},
      },
      groups: {
        subResources: {},
      },
    });
  });
});
