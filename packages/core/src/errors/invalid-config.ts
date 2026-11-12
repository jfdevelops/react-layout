import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface InvalidConfigContext {
  config?: unknown;
  reason: string;
  scope: 'config';
}

const context = createContextSchema<InvalidConfigContext>();

/** Thrown when a React Layout configuration is invalid. */
export class InvalidConfigError extends createReactLayoutError({
  code: 'invalidConfig',
  scope: 'config',
})
  .defineContext(context)
  .implement(
    ({ context, scope }) => `[${scope}]: The layout configuration is invalid: ${context.reason}`,
  ) {}
