import { describe, expect, it, vi } from 'vitest';
import { createPathParams } from '../../src/create-config/for-paths/params';
import { InvalidResourceError } from '../../src/errors';

describe('parameter validation collection', () => {
  it('validates deeply nested subresource parameters without recursive flattening', () => {
    const params = createPathParams(
      {
        users: {
          admins: {},
        },
      },
      ['users.$subResource'],
      {
        include: {
          path: true,
        },
      },
    );
    let subResource: string | { value: string; subResource: unknown } =
      'admins';

    for (let index = 0; index < 10000; index++) {
      subResource = {
        value: 'admins',
        subResource,
      };
    }

    expect(
      params.resolve({
        subResource,
      }).subResource,
    ).toBe(subResource);
  });

  it('reports malformed nested values before unavailable slugs', () => {
    const params = createPathParams(
      {
        users: {
          admins: {},
        },
      },
      ['users.$subResource'],
      {
        include: {
          path: true,
        },
      },
    );

    expect(() =>
      params.resolve({
        resource: 'users',
        subResource: {
          value: 'missing',
          subResource: null,
        },
      }),
    ).toThrow(/must be a slug/);
    expect(() =>
      params.resolve({
        resource: 'users',
        subResource: {
          value: 'admins',
          subResource: 'missing',
        },
      }),
    ).toThrow(/contains a sub-resource unavailable/);
    expect(() =>
      params.resolve({
        resource: 'users',
        subResource: {
          value: 'admins',
          subResource: '',
        },
      }),
    ).toThrow(/must be a slug/);
  });

  it('does not inspect the config when no path parameters or keys are included', () => {
    const readResource = vi.fn<() => Record<string, unknown>>(() => ({}));
    const config = Object.defineProperty({}, 'users', {
      enumerable: true,
      get: readResource,
    });
    const params = createPathParams(config, ['$resource'], {});

    expect(params.resolve({})).toEqual({});
    expect(readResource).not.toHaveBeenCalled();
  });

  it('does not inspect descendants when only the resource parameter is included', () => {
    const readDescendant = vi.fn<() => Record<string, unknown>>(() => ({}));
    const users = Object.defineProperty({}, 'admins', {
      enumerable: true,
      get: readDescendant,
    });
    const params = createPathParams(
      {
        users,
      },
      ['$resource'],
      {
        include: {
          path: true,
        },
      },
    );

    expect(
      params.resolve({
        resource: 'users',
      }),
    ).toEqual({
      resource: 'users',
    });
    expect(() =>
      params.resolve({
        resource: 'missing',
      }),
    ).toThrow(InvalidResourceError);
    expect(readDescendant).not.toHaveBeenCalled();
  });
});
