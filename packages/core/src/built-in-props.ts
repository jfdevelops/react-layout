import { reactNode } from '@jfdevelops/react-layout-adapter-arktype';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';
import type { ReactNode } from 'react';

/** The schema behind the `children: 'required'` shorthand. */
export type RequiredChildren = StandardSchemaV1<
  Exclude<ReactNode, undefined>,
  Exclude<ReactNode, undefined>
>;

/** A children slot that may be omitted. */
export type OptionalChildren = StandardSchemaV1<ReactNode, ReactNode>;

export const requiredChildren: RequiredChildren = reactNode();

/**
 * Wraps a schema so a missing value is accepted without consulting it. Any
 * supplied value is still validated by the original schema.
 */
export function optionalDefinition<Input, Output>(
  definition: StandardSchemaV1<Input, Output>,
): StandardSchemaV1<Input | undefined, Output | undefined> {
  const standard = definition['~standard'];

  return {
    '~standard': {
      version: 1,
      vendor: standard.vendor,
      validate: (value) =>
        value === undefined
          ? {
              value: undefined,
            }
          : standard.validate(value),
    },
  };
}

export const optionalChildren: OptionalChildren = optionalDefinition(requiredChildren);

/** Whether a schema accepts a missing value. */
export function acceptsUndefined(definition: StandardSchemaV1) {
  const result = definition['~standard'].validate(undefined);

  if (result instanceof Promise) {
    void result.catch(() => {});

    return false;
  }

  return !result.issues;
}

/**
 * Validates an object whose keys are declared by separate schemas. Undeclared
 * keys pass through unchanged.
 */
export function objectDefinition(
  definitions: Record<string, StandardSchemaV1>,
): StandardSchemaV1<Record<string, unknown>, Record<string, unknown>> {
  return {
    '~standard': {
      version: 1,
      vendor: 'react-layout',
      validate(value) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          return {
            issues: [
              {
                message: 'Expected an object',
              },
            ],
          };
        }
        const input = value as Record<string, unknown>;
        const output = {
          ...input,
        };
        const issues: StandardSchemaV1.Issue[] = [];

        for (const key of Object.keys(definitions)) {
          const result = definitions[key]!['~standard'].validate(input[key]);

          if (result instanceof Promise) {
            void result.catch(() => {});
            throw new TypeError('React Layout schemas must validate synchronously.');
          }
          if (result.issues) {
            issues.push(
              ...result.issues.map((issue) => ({
                ...issue,
                path: [key, ...(issue.path ?? [])],
              })),
            );
          } else if (key in input || result.value !== undefined) {
            output[key] = result.value;
          }
        }

        return issues.length > 0
          ? {
              issues,
            }
          : {
              value: output,
            };
      },
    },
  };
}
