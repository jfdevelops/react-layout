import { expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createResourceSchema } from '../src';
import { describeResourceSchemaContract } from '../../adapters/tests/resource-schema-contract';
import {
  createResourceSchemaTypeCases,
  type ResourceSchemaExpectedOutputs,
} from '../../adapters/tests/resource-schema-fixtures';

describeResourceSchemaContract(createResourceSchema);

const schemas = createResourceSchemaTypeCases(createResourceSchema);
type Outputs = {
  [Key in keyof typeof schemas]: z.infer<(typeof schemas)[Key]>;
};

it('preserves native inference across every resource schema type case', () => {
  expectTypeOf<Outputs>().toEqualTypeOf<ResourceSchemaExpectedOutputs<false>>();
});

it('composes the returned native schemas inside an object schema', () => {
  const schema = z.object({
    resources: schemas.arrayPaths,
  });

  expect(
    schema.parse({
      resources: ['users.details'],
    }),
  ).toEqual({
    resources: ['users.details'],
  });
  expect(
    schema.safeParse({
      resources: ['details'],
    }).success,
  ).toBe(false);
});
