import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  builtIn,
  PropError,
  validateProps,
  type PropValidatorSchema,
  type StandardSchemaV1,
} from '../src';

function issuesOf(schema: StandardSchemaV1, value: unknown) {
  const result = schema['~standard'].validate(value);

  if (result instanceof Promise) {
    throw new TypeError('Expected a synchronous result');
  }

  return (result.issues ?? []).map((issue) => ({
    message: issue.message,
    path: issue.path,
  }));
}

describe('built-in validators', () => {
  it('validates primitives', () => {
    expectTypeOf(builtIn.string).toEqualTypeOf<PropValidatorSchema<string>>();
    expectTypeOf(builtIn.number).toEqualTypeOf<PropValidatorSchema<number>>();
    expectTypeOf(builtIn.boolean).toEqualTypeOf<PropValidatorSchema<boolean>>();
    expectTypeOf(builtIn.unknown).toEqualTypeOf<PropValidatorSchema<unknown>>();
    expect(issuesOf(builtIn.string, 'a')).toEqual([]);
    expect(issuesOf(builtIn.string, 1)).toEqual([
      {
        message: 'Expected a string',
        path: undefined,
      },
    ]);
    expect(issuesOf(builtIn.number, Number.NaN)).toHaveLength(1);
    expect(issuesOf(builtIn.boolean, 'true')).toHaveLength(1);
    expect(issuesOf(builtIn.unknown, undefined)).toEqual([]);
    expect(issuesOf(builtIn.callable, () => null)).toEqual([]);
    expect(issuesOf(builtIn.callable, {})).toHaveLength(1);
  });

  it('shares one optional definition', () => {
    expect(builtIn.string.optional()).toBe(builtIn.string.optional());
    expect(issuesOf(builtIn.string.optional(), undefined)).toEqual([]);
    expect(issuesOf(builtIn.string.optional(), 1)).toHaveLength(1);
  });

  it('validates one of the listed values', () => {
    const tone = builtIn.literal('info', 'warning');

    expectTypeOf(tone).toEqualTypeOf<PropValidatorSchema<'info' | 'warning'>>();
    expect(issuesOf(tone, 'info')).toEqual([]);
    expect(issuesOf(tone, 'loud')).toEqual([
      {
        message: 'Expected one of info, warning',
        path: undefined,
      },
    ]);
  });

  it('validates the empty slots of a sparse array', () => {
    const sparse: unknown[] = ['a'];

    sparse[2] = 'c';

    expect(issuesOf(builtIn.array(builtIn.string), sparse)).toEqual([
      {
        message: 'Expected a string',
        path: [1],
      },
    ]);
    expect(
      builtIn.array(builtIn.string.optional())['~standard'].validate(sparse),
    ).toEqual({
      value: ['a', undefined, 'c'],
    });
  });

  it('accepts a value that matches any member of a union', () => {
    const label = builtIn.union(
      builtIn.string,
      builtIn.object({
        value: builtIn.string,
      }),
    );

    expectTypeOf(label).toEqualTypeOf<
      PropValidatorSchema<
        | string
        | {
            value: string;
          }
      >
    >();
    expect(issuesOf(label, 'Users')).toEqual([]);
    expect(
      issuesOf(label, {
        value: 'Users',
      }),
    ).toEqual([]);
    expect(issuesOf(label, 1)).toEqual([
      {
        message: 'Expected a string or an object',
        path: undefined,
      },
    ]);
    expect(
      issuesOf(label, {
        value: 1,
      }),
    ).toEqual([
      {
        message: 'Expected a string',
        path: ['value'],
      },
    ]);
  });

  it.each([
    {
      schema: builtIn.record(builtIn.string),
      input: JSON.parse('{"__proto__":"Home","users":"Users"}'),
    },
    {
      schema: builtIn.record(
        builtIn.object({
          value: builtIn.string,
        }),
      ),
      input: JSON.parse(
        '{"__proto__":{"value":"Home"},"users":{"value":"Users"}}',
      ),
    },
  ])(
    'preserves own record keys without changing its prototype',
    async ({ schema, input }) => {
      const result = await schema['~standard'].validate(input);

      expect(result).toEqual({
        value: input,
      });

      if (result.issues) {
        throw new Error('Expected the record to validate');
      }

      expect(Object.hasOwn(result.value, '__proto__')).toBe(true);
      expect(Object.keys(result.value)).toEqual(['__proto__', 'users']);
      expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype);
    },
  );

  it('validates arrays, tuples and records with item paths', () => {
    const names = builtIn.array(builtIn.string);
    const pair = builtIn.tuple(builtIn.string, builtIn.number);
    const counts = builtIn.record(builtIn.number);

    expectTypeOf(names).toEqualTypeOf<PropValidatorSchema<string[]>>();
    expectTypeOf(pair).toEqualTypeOf<PropValidatorSchema<[string, number]>>();
    expectTypeOf(counts).toEqualTypeOf<
      PropValidatorSchema<Record<string, number>>
    >();
    expect(issuesOf(names, ['a', 1])).toEqual([
      {
        message: 'Expected a string',
        path: [1],
      },
    ]);
    expect(issuesOf(pair, ['a', 1])).toEqual([]);
    expect(issuesOf(pair, ['a'])).toEqual([
      {
        message: 'Expected an array of 2 items',
        path: undefined,
      },
    ]);
    expect(
      issuesOf(counts, {
        a: 1,
        b: 'two',
      }),
    ).toEqual([
      {
        message: 'Expected a number',
        path: ['b'],
      },
    ]);
  });

  it('validates objects, with optional keys and nested paths', () => {
    const user = builtIn.object({
      name: builtIn.string,
      nickname: builtIn.string.optional(),
      meta: builtIn.unknown,
      roles: builtIn.array(builtIn.literal('admin', 'member')),
    });

    expectTypeOf(user).toEqualTypeOf<
      PropValidatorSchema<{
        name: string;
        meta: unknown;
        roles: Array<'admin' | 'member'>;
        nickname?: string | undefined;
      }>
    >();
    expect(
      issuesOf(user, {
        name: 'Ada',
        meta: 1,
        roles: ['admin'],
      }),
    ).toEqual([]);
    expect(
      issuesOf(user, {
        name: 1,
        roles: ['admin', 'owner'],
      }),
    ).toEqual([
      {
        message: 'Expected a string',
        path: ['name'],
      },
      {
        message: 'Expected one of admin, member',
        path: ['roles', 1],
      },
    ]);
    expect(issuesOf(user, [])).toEqual([
      {
        message: 'Expected an object',
        path: undefined,
      },
    ]);
  });

  it('nests any Standard Schema and keeps unlisted keys', () => {
    const settings = builtIn.object({
      count: z.string().transform(Number),
    });
    const result = settings['~standard'].validate({
      count: '2',
      extra: true,
    });

    expect(result).toEqual({
      value: {
        count: 2,
        extra: true,
      },
    });
  });

  it('reports the nested path through prop validation', () => {
    let caught: unknown;

    try {
      validateProps(
        {
          user: builtIn.object({
            name: builtIn.string,
          }),
        },
        {
          user: {
            name: 1,
          },
        },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PropError);
    expect(caught).toMatchObject({
      path: 'user.name',
      message: 'Invalid prop "user.name": Expected a string',
    });
  });
});
