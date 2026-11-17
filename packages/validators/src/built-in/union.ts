import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createSchema, pass, type SchemaResult } from '../schema';

const expectedPrefix = 'Expected ';

// "Expected a string" and "Expected an object" read as one sentence:
// "Expected a string or an object".
function describeExpected(messages: ReadonlyArray<string>) {
  if (messages.every((message) => message.startsWith(expectedPrefix))) {
    return (
      expectedPrefix +
      messages
        .map((message) => message.slice(expectedPrefix.length))
        .join(' or ')
    );
  }

  return messages.join('; ');
}

function isNested(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
  return issues.every((issue) => (issue.path?.length ?? 0) > 0);
}

/**
 * Accepts a value that matches any of `schemas`, tried in order. When none
 * matches, a schema that accepted the kind of value but rejected something
 * inside it reports its issues; otherwise one issue lists what was expected.
 */
export function union<const Schemas extends ReadonlyArray<StandardSchemaV1>>(
  ...schemas: Schemas
) {
  return createSchema(
    (value): SchemaResult<StandardSchemaV1.InferOutput<Schemas[number]>> => {
      const failures: Array<ReadonlyArray<StandardSchemaV1.Issue>> = [];

      for (const schema of schemas) {
        const result = schema['~standard'].validate(value);

        if (result instanceof Promise) {
          // Handle rejected async refinements without leaking an unhandled rejection.
          void result.catch(() => {});

          throw new TypeError(
            'React Layout schemas must validate synchronously.',
          );
        }

        if (!result.issues) {
          return pass(
            result.value as StandardSchemaV1.InferOutput<Schemas[number]>,
          );
        }

        failures.push(result.issues);
      }

      const nested = failures.find(isNested);

      if (nested) {
        return {
          issues: nested,
        };
      }

      return {
        issues: [
          {
            message: describeExpected(
              failures.flatMap((issues) =>
                issues.map((issue) => issue.message),
              ),
            ),
          },
        ],
      };
    },
    {
      kind: 'union',
      items: schemas,
    },
  );
}
