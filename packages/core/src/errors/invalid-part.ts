import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  part: 'string',
  validParts: 'string[]',
  scope: "'namingPart'"
});

export type InvalidPartContext = typeof context.infer;

/**
 * Thrown when a naming convention receives a part it has not declared.
 */
export class InvalidPartError extends createReactLayoutError({
  code: 'invalidPart',
  scope: 'namingPart'
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const available =
      context.validParts.length > 0
        ? ` Available parts are ${context.validParts
            .map((part) => JSON.stringify(part))
            .join(', ')}.`
        : ' No parts are defined.';
    return `[${scope}]: Naming part ${JSON.stringify(
      context.part
    )} is not defined.${available}`;
  }) {}
