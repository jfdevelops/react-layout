import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  path: 'string',
  'providedVariables?': 'string[]',
  scope: "'pathVariable'",
  variable: 'string',
});

export type MissingPathVariableContext = typeof context.infer;

/** Thrown when a required layout path variable was not provided. */
export class MissingPathVariableError extends createReactLayoutError({
  code: 'missingPathVariable',
  scope: 'pathVariable',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const providedMessage =
      context.providedVariables && context.providedVariables.length > 0
        ? ` Provided variables were ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(context.providedVariables.map((provided) => `$${provided}`))}.`
        : ' No path variables were provided.';

    return `[${scope}]: Path "${context.path}" requires $${context.variable}.${providedMessage}`;
  }) {}
