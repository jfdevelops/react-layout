import { object, safeParse } from 'valibot';
import { expect, expectTypeOf, it } from 'vitest';
import type { InferOutput } from 'valibot';
import { createResourceSchema } from '../src';
import { describeResourceSchemaContract } from '../../adapters/tests/resource-schema-contract';
import {
  createResourceSchemaTypeCases,
  type ResourceSchemaExpectedOutputs,
} from '../../adapters/tests/resource-schema-fixtures';

describeResourceSchemaContract(createResourceSchema);

const schemas = createResourceSchemaTypeCases(createResourceSchema);
type Outputs = {
  [Key in keyof typeof schemas]: InferOutput<(typeof schemas)[Key]>;
};

it('preserves native inference across every resource schema type case', () => {
  expectTypeOf<Outputs>().toEqualTypeOf<ResourceSchemaExpectedOutputs<false>>();
});

it('composes the returned native schemas inside an object schema', () => {
  const schema = object({
    resources: schemas.arrayPaths,
  });

  expect(
    safeParse(schema, {
      resources: ['users.details'],
    }).success,
  ).toBe(true);
  expect(
    safeParse(schema, {
      resources: ['details'],
    }).success,
  ).toBe(false);
});
