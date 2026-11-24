import { expect, it, vi } from 'vitest';
import { createResourceSchemaAdapter, type ResourceSchemaTypes } from '../src';
import { resourceDefinitions } from './resource-schema-fixtures';

function createNativeSchema(values: string[]) {
  return {
    values,
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate(value: unknown) {
        return {
          value,
        };
      },
    },
  };
}

interface TestSchemas extends ResourceSchemaTypes {
  readonly union: ReturnType<typeof createNativeSchema>;
  readonly array: ReturnType<typeof createNativeSchema>;
}

it('deduplicates literals and wraps the same native union only for array format', () => {
  const union = vi.fn<typeof createNativeSchema>(createNativeSchema);
  const array = vi.fn<
    (
      schema: ReturnType<typeof createNativeSchema>,
    ) => ReturnType<typeof createNativeSchema>
  >((schema) => createNativeSchema(schema.values));
  const createSchema = createResourceSchemaAdapter<TestSchemas>({
    union,
    array,
  });
  const scalar = createSchema(resourceDefinitions);

  expect(union).toHaveBeenCalledExactlyOnceWith([
    'posts',
    'users',
    'teams',
    "quote' | string",
    'empty',
  ]);
  expect(array).not.toHaveBeenCalled();
  expect(scalar).toBe(union.mock.results[0].value);

  const list = createSchema(resourceDefinitions, {
    format: 'array',
    nested: 'names',
  });

  expect(union).toHaveBeenCalledTimes(2);
  expect(union).toHaveBeenLastCalledWith([
    'posts',
    'users',
    'details',
    'edit',
    'shared',
    'teams',
    "quote' | string",
    'empty',
  ]);
  expect(array).toHaveBeenCalledExactlyOnceWith(union.mock.results[1].value);
  expect(list).toBe(array.mock.results[0].value);
});

it('does not call native constructors when resource resolution fails', () => {
  const union = vi.fn<typeof createNativeSchema>(createNativeSchema);
  const array = vi.fn<
    (
      schema: ReturnType<typeof createNativeSchema>,
    ) => ReturnType<typeof createNativeSchema>
  >((schema) => createNativeSchema(schema.values));
  const createSchema = createResourceSchemaAdapter<TestSchemas>({
    union,
    array,
  });

  expect(() => createSchema(() => null)).toThrow(TypeError);
  expect(union).not.toHaveBeenCalled();
  expect(array).not.toHaveBeenCalled();
});
