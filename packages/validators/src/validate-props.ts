import type { AnyBuiltPropDefinition } from './types';
import { isStandardSchema, validateDefinition } from './standard-schema';
import { createMismatchedPropMessage, createMissingPropMessage, PropError } from './prop-error';

export type PropValidationContext = {
  layoutName?: string;
  resource?: string;
};

export function validateProps<T extends object>(
  shape: Record<string, AnyBuiltPropDefinition>,
  props: T,
  context?: PropValidationContext,
) {
  let validatedProps = props;
  for (const key in shape) {
    const prop = shape[key];

    if (isStandardSchema(prop)) {
      try {
        const value = validateDefinition(prop, (props as Record<string, unknown>)[key]);
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
      continue;
    }

    if (prop.visibility === 'required' && !(key in props)) {
      throw new PropError({
        layoutName: context?.layoutName,
        path: key,
        resource: context?.resource,
        received: Object.keys(props),
        expected: Object.keys(shape),
        message: createMissingPropMessage({
          path: key,
          layoutName: context?.layoutName,
          resource: context?.resource,
        }),
      });
    }

    if (prop.visibility === 'optional' && !(key in props)) {
      continue;
    }

    const value = (props as Record<string, unknown>)[key];

    if ('type' in prop && prop.type === 'JSX.Element' && typeof value === 'function') {
      continue;
    }

    try {
      const validatedValue = validateDefinition(prop, value);

      if (!Object.is(validatedValue, value)) {
        if (validatedProps === props) {
          validatedProps = {
            ...props,
          };
        }

        (validatedProps as Record<string, unknown>)[key] = validatedValue;
      }
    } catch (error) {
      if (!(error instanceof PropError)) {
        throw error;
      }

      const path = error.path === 'value' ? key : `${key}.${error.path}`;

      throw new PropError({
        layoutName: context?.layoutName,
        path,
        resource: context?.resource,
        received: error.received,
        expected: error.expected,
        message: error.message.startsWith('Invalid prop')
          ? createMismatchedPropMessage({
              path,
              layoutName: context?.layoutName,
              resource: context?.resource,
              received: error.received,
              expected: error.expected,
            })
          : createMissingPropMessage({
              path,
              layoutName: context?.layoutName,
              resource: context?.resource,
            }),
      });
    }
  }

  return validatedProps;
}
