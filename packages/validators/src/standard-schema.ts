import type { StandardSchemaV1 } from '@standard-schema/spec';
import { PropError } from './prop-error';

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null
  ) {
    return false;
  }
  if (!('~standard' in value)) {
    return false;
  }
  const standard = value['~standard'];

  return (
    typeof standard === 'object' &&
    standard !== null &&
    'version' in standard &&
    standard.version === 1 &&
    'validate' in standard &&
    typeof standard.validate === 'function'
  );
}

/** Validates one value synchronously and returns the schema's output. */
export function validateDefinition<Definition extends StandardSchemaV1>(
  definition: Definition,
  value: unknown,
): StandardSchemaV1.InferOutput<Definition> {
  const result = definition['~standard'].validate(value);
  if (
    result instanceof Promise ||
    ('then' in result && typeof result.then === 'function')
  ) {
    // Handle rejected async refinements without leaking an unhandled rejection.
    void Promise.resolve(result).catch(() => {});
    throw new TypeError('React Layout schemas must validate synchronously.');
  }
  if (result.issues) {
    const issue = result.issues[0];
    const path =
      issue?.path
        ?.map((segment) =>
          typeof segment === 'object' ? String(segment.key) : String(segment),
        )
        .join('.') || 'value';
    throw new PropError({
      path,
      received: value,
      expected: definition['~standard'].vendor,
      message: issue?.message ?? 'Schema validation failed',
      issues: result.issues,
    });
  }

  return result.value;
}

/**
 * Reads the supplied values out of a record that may still hold definitions:
 * an entry that is a schema has no value yet, so it resolves to `undefined`.
 */
export function resolvePropDefinitionValues(input: Record<string, unknown>) {
  const values: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    const value = input[key];
    values[key] = isStandardSchema(value) ? undefined : value;
  }

  return values;
}
