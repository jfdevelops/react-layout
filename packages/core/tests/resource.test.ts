import { describe, expect, it } from 'vitest';
import { normalizeResource, normalizeResources } from '../src';

describe('resource helpers', () => {
  it('normalizes single and nested resources', () => {
    expect(normalizeResource('users')).toEqual({
      users: {
        subResources: {},
      },
    });

    expect(
      normalizeResources([
        'users',
        {
          value: 'teams',
          subResources: ['members'],
        },
      ]),
    ).toEqual({
      users: {
        subResources: {},
      },
      teams: {
        subResources: {
          members: {
            subResources: {},
          },
        },
      },
    });
  });

  it('returns an empty object when no resources are provided', () => {
    expect(normalizeResources([])).toEqual({});
  });
});
