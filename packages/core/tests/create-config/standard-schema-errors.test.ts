import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PropError, validateProps } from '../../src';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';

describe('Standard Schema validation errors', () => {
  it('retains all schema issues and contextual paths', () => {
    try {
      validateProps(
        { users: z.array(z.object({ name: z.string(), age: z.number() })) },
        { users: [{ name: 3, age: 'old' }] },
        { layoutName: 'Users', resource: 'users' },
      );
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PropError);
      const propError = error as PropError;
      expect(propError.layoutName).toBe('Users');
      expect(propError.resource).toBe('users');
      expect(propError.path).toBe('users.0.name');
      expect(propError.issues?.map((issue) => issue.path)).toEqual([
        ['users', 0, 'name'], ['users', 0, 'age'],
      ]);
      expect(propError.message).toContain('expected string');
    }
  });

  it('rejects async validation without swallowing synchronous schema exceptions', () => {
    const asyncSchema: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate: async () => { throw new Error('Async failure'); } },
    };
    expect(() => validateProps({ value: asyncSchema }, { value: 1 })).toThrow('must validate synchronously');
    const schema: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate: () => { throw new Error('Schema bug'); } },
    };
    expect(() => validateProps({ value: schema }, { value: 1 })).toThrow('Schema bug');
  });

  it('supports standalone protocol implementations and keeps caller objects untouched', () => {
    const schema: StandardSchemaV1<string | undefined, number> = {
      '~standard': { version: 1, vendor: 'test', validate: (value) => ({ value: Number(value ?? 2) }) },
    };
    const props = Object.freeze({ count: '3', extra: true });
    expect(validateProps({ count: schema }, props)).toEqual({ count: 3, extra: true });
    expect(props.count).toBe('3');
    expect(validateProps({ count: schema }, {})).toEqual({ count: 2 });
  });
});
