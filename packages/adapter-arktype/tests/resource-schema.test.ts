import { type } from 'arktype';
import { expect, expectTypeOf, it } from 'vitest';

import { createResourceSchema } from '../src';
import { describeResourceSchemaContract } from '../../adapters/tests/resource-schema-contract';
import {
  createResourceSchemaTypeCases,
  type ResourceSchemaExpectedOutputs,
} from '../../adapters/tests/resource-schema-fixtures';

describeResourceSchemaContract(createResourceSchema);

const schemas = createResourceSchemaTypeCases(createResourceSchema);
type Outputs = {
  [Key in keyof typeof schemas]: (typeof schemas)[Key]['infer'];
};

it('preserves native inference across every resource schema type case', () => {
  expectTypeOf<Outputs>().toEqualTypeOf<ResourceSchemaExpectedOutputs<false>>();
});

it('composes the returned native schemas inside an object schema', () => {
  const schema = type({
    resources: schemas.arrayPaths,
  });

  expect(
    schema.allows({
      resources: ['users.details'],
    }),
  ).toBe(true);
  expect(
    schema.allows({
      resources: ['details'],
    }),
  ).toBe(false);
});
