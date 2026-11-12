import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Creates a dependency-free Standard Schema for error contexts that are built
 * by library code. The schema is type-only: it passes values through (or maps
 * them with `transform`) without runtime validation, which keeps validation
 * libraries out of consumer bundles.
 *
 * @internal
 */
export function createContextSchema<Output, Input = Output>(
  transform?: (input: Input) => Output,
): StandardSchemaV1<Input, Output> {
  return {
    '~standard': {
      version: 1,
      vendor: 'react-layout',
      validate: (value) => ({
        value: transform ? transform(value as Input) : (value as Output),
      }),
    },
  };
}
