import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'pathVariable' as const;

/** Context describing a variable required to resolve a layout path. */
export interface MissingPathVariableContext
  extends ReactLayoutErrorContext<typeof scope> {
  variable: string;
  path: string;
  providedVariables?: readonly string[];
}

/** Thrown when a required layout path variable was not provided. */
export class MissingPathVariableError extends createReactLayoutError(
  { code: 'missingPathVariable', scope },
)(
  (
    scope,
    { variable, path, providedVariables }: MissingPathVariableContext,
  ) => {
    const providedMessage =
      providedVariables && providedVariables.length > 0
        ? ` Provided variables were ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(providedVariables.map((provided) => `$${provided}`))}.`
        : ' No path variables were provided.';

    return `[${scope}]: Path "${path}" requires $${variable}.${providedMessage}`;
  },
) {}
