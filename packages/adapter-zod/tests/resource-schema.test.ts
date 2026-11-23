import { expectTypeOf, it } from 'vitest';
import { createResourceSchema } from '../src';
import { describeResourceSchemaContract } from '../../adapters/tests/resource-schema-contract';

const resources = {
  raw: () =>
    [
      'posts',
      {
        value: 'users',
        subResources: ['details'],
      },
    ] as const,
};
const schema = createResourceSchema(resources);
const paths = createResourceSchema(resources, {
  nested: 'paths',
});
import type { z } from 'zod';
type Output = z.infer<typeof schema>;
type Paths = z.infer<typeof paths>;

describeResourceSchemaContract((resources, options) =>
  options
    ? createResourceSchema(resources, options)
    : createResourceSchema(resources),
);

it('preserves native schema literal inference', () => {
  expectTypeOf<Output>().toEqualTypeOf<'posts' | 'users'>();
  expectTypeOf<Paths>().toEqualTypeOf<'posts' | 'users' | 'users.details'>();
});

const arraySchema = createResourceSchema(resources, {
  format: 'array',
  nested: 'names',
});
type ArrayOutput = z.infer<typeof arraySchema>;
it('preserves array schema output inference', () => {
  expectTypeOf<ArrayOutput>().toEqualTypeOf<
    ('posts' | 'users' | 'details')[]
  >();
});
