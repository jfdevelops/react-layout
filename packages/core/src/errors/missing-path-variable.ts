import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface MissingPathVariableContext {
  path: string;
  providedVariables?: string[];
  scope: 'pathVariable';
  variable: string;
}

const context = createContextSchema<MissingPathVariableContext>();

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
