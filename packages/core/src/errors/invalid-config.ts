import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'config' as const;

/** Context describing a configuration that React Layout cannot use. */
export interface InvalidConfigContext
  extends ReactLayoutErrorContext<typeof scope> {
  reason: string;
  config?: unknown;
}

/** Thrown when a React Layout configuration is invalid. */
export class InvalidConfigError extends createReactLayoutError(
  { code: 'invalidConfig', scope },
)(
  (scope, { reason }: InvalidConfigContext) =>
    `[${scope}]: The layout configuration is invalid: ${reason}`,
) {}
