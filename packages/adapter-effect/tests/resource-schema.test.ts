import { Schema } from 'effect';
import { expect, expectTypeOf, it } from 'vitest';

import { createResourceSchema } from '../src';
import { describeResourceSchemaContract } from '../../adapters/tests/resource-schema-contract';
import {
  createResourceSchemaTypeCases,
  type ResourceSchemaExpectedOutputs,
} from '../../adapters/tests/resource-schema-fixtures';

describeResourceSchemaContract(createResourceSchema);

const schemas = createResourceSchemaTypeCases(createResourceSchema);
type Outputs = { [Key in keyof typeof schemas]: (typeof schemas)[Key]['Type'] };

it('preserves native inference across every resource schema type case', () => {
  expectTypeOf<Outputs>().toEqualTypeOf<ResourceSchemaExpectedOutputs<true>>();
});

it('composes the returned native schemas inside an object schema', () => {
  const schema = Schema.Struct({
    resources: schemas.arrayPaths,
  });
  const decode = Schema.decodeUnknownSync(schema);

  expect(
    decode({
      resources: ['users.details'],
    }),
  ).toEqual({
    resources: ['users.details'],
  });
  expect(() =>
    decode({
      resources: ['details'],
    }),
  ).toThrow(/details/);
});
