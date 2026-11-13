import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  isStandardSchema,
  PropError,
  validateDefinition,
  validateProps,
  type ResolveInputProps,
  type ResolveProps,
} from '../src';

function capturePropError(validate: () => unknown) {
  let caught: unknown;

  try {
    validate();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(PropError);

  return caught as PropError;
}

describe('validateProps', () => {
  const shape = {
    title: z.string(),
    count: z.string().transform(Number),
    label: z.string().default('Items'),
    note: z.string().optional(),
  };

  it('returns schema outputs, applying transforms and defaults', () => {
    const props = {
      title: 'Users',
      count: '2',
      extra: true,
    };

    expect(validateProps(shape, props)).toEqual({
      title: 'Users',
      count: 2,
      label: 'Items',
      extra: true,
    });
    expect(props.count).toBe('2');
  });

  it('reports a missing required prop with its path and context', () => {
    const error = capturePropError(() =>
      validateProps(
        shape,
        {
          count: '2',
        },
        {
          layoutName: 'Users',
          resource: 'users',
        },
      ),
    );

    expect(error.path).toBe('title');
    expect(error.layoutName).toBe('Users');
    expect(error.resource).toBe('users');
    expect(error.message).toMatch(/^Invalid prop "title": /);
    expect(error.issues?.[0]?.path).toEqual(['title']);
  });

  it('prefixes nested issue paths with the prop name', () => {
    const error = capturePropError(() =>
      validateProps(
        {
          owner: z.object({
            name: z.string(),
          }),
        },
        {
          owner: {
            name: 1,
          },
        },
      ),
    );

    expect(error.path).toBe('owner.name');
    expect(error.issues?.[0]?.path).toEqual(['owner', 'name']);
  });

  it('rejects asynchronous schemas', () => {
    const asyncSchema = z.string().refine(async () => true);

    expect(() => validateDefinition(asyncSchema, 'value')).toThrow(
      'React Layout schemas must validate synchronously.',
    );
  });

  it('recognizes Standard Schema definitions', () => {
    expect(isStandardSchema(z.string())).toBe(true);
    expect(isStandardSchema(() => 'value')).toBe(false);
    expect(isStandardSchema(null)).toBe(false);
  });

  it('resolves output and input shapes with optional keys', () => {
    expectTypeOf<ResolveProps<typeof shape>>().toEqualTypeOf<
      {
        title: string;
        count: number;
        label: string;
      } & {
        note?: string | undefined;
      }
    >();
    expectTypeOf<ResolveInputProps<typeof shape>>().toEqualTypeOf<
      {
        title: string;
        count: string;
      } & {
        label?: string | undefined;
        note?: string | undefined;
      }
    >();
  });
});
