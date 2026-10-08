import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  'config?': 'unknown',
  reason: 'string',
  scope: "'config'",
});

export type InvalidConfigContext = typeof context.infer;

/** Thrown when a React Layout configuration is invalid. */
export class InvalidConfigError extends createReactLayoutError({
  code: 'invalidConfig',
  scope: 'config',
})
  .defineContext(context)
  .implement(
    ({ context, scope }) =>
      `[${scope}]: The layout configuration is invalid: ${context.reason}`,
  ) {}
