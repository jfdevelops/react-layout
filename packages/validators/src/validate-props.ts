import type { PropDefinitions } from './types';
import { validateDefinition } from './standard-schema';
import { PropError } from './prop-error';

export type PropValidationContext = {
  layoutName?: string;
  resource?: string;
};

/**
 * Validates each declared prop against its schema and returns the props with
 * schema outputs applied. Missing props are validated as `undefined`, so
 * optional schemas and defaults behave as their library defines.
 */
export function validateProps<T extends object>(
  shape: PropDefinitions,
  props: T,
  context?: PropValidationContext,
) {
  let validatedProps = props;
  for (const key in shape) {
    try {
      const value = validateDefinition(
        shape[key]!,
        (props as Record<string, unknown>)[key],
      );
      if (validatedProps === props) {
        validatedProps = {
          ...props,
        };
      }
      if (key in props || value !== undefined) {
        (validatedProps as Record<string, unknown>)[key] = value;
      }
    } catch (error) {
      if (!(error instanceof PropError)) {
        throw error;
      }
      const path = error.path === 'value' ? key : `${key}.${error.path}`;
      throw new PropError({
        layoutName: context?.layoutName,
        resource: context?.resource,
        path,
        received: error.received,
        expected: error.expected,
        message: `Invalid prop "${path}": ${error.message}`,
        issues: error.issues?.map((issue) => ({
          ...issue,
          path: [key, ...(issue.path ?? [])],
        })),
      });
    }
  }

  return validatedProps;
}
