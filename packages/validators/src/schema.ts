import type { StandardSchemaV1 } from '@standard-schema/spec';

/** The prop definition created from a custom validator. */
export interface PropValidatorSchema<Value> extends StandardSchemaV1<
  Value,
  Value
> {
  /**
   * The same validator for a prop that may be left out. Every call returns
   * the same definition.
   */
  optional(): PropValidatorSchema<Value | undefined>;
}

/** The result of validating one value. */
export type SchemaResult<Value> = StandardSchemaV1.Result<Value>;

/** Accepts a value. */
export function pass<Value>(value: Value): SchemaResult<Value> {
  return {
    value,
  };
}

/** Rejects a value with one message. */
export function fail(message: string): SchemaResult<never> {
  return {
    issues: [
      {
        message,
      },
    ],
  };
}

/**
 * Creates a synchronous Standard Schema from a function that returns a
 * result. It depends on nothing else in the library, so the library's own
 * errors can validate their contexts with it.
 */
export function createSchema<Value>(
  validate: (value: unknown) => SchemaResult<Value>,
): PropValidatorSchema<Value> {
  let optionalSchema: PropValidatorSchema<Value | undefined> | undefined;

  return {
    '~standard': {
      version: 1,
      vendor: 'react-layout',
      validate,
    },
    optional() {
      optionalSchema ??= createSchema<Value | undefined>((value) =>
        value === undefined ? pass(undefined) : validate(value),
      );

      return optionalSchema;
    },
  };
}

/** Validates a nested value and places its issues under `key`. */
export function validateNested<Value>(
  schema: StandardSchemaV1<unknown, Value>,
  value: unknown,
  key: PropertyKey,
): SchemaResult<Value> {
  const result = schema['~standard'].validate(value);

  if (result instanceof Promise) {
    // Handle rejected async refinements without leaking an unhandled rejection.
    void result.catch(() => {});

    throw new TypeError('React Layout schemas must validate synchronously.');
  }

  if (!result.issues) {
    return result;
  }

  return {
    issues: result.issues.map((issue) => ({
      ...issue,
      path: [key, ...(issue.path ?? [])],
    })),
  };
}

/** Whether a value is a plain record rather than an array or `null`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
