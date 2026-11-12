import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface LayoutConfigurationErrorContext {
  message: string;
  scope: 'configuration';
}

const context = createContextSchema<LayoutConfigurationErrorContext, string>((message) => ({
  message,
  scope: 'configuration',
}));

/** Thrown when a layout or resource configuration cannot be used. */
export class LayoutConfigurationError extends createReactLayoutError({
  code: 'layoutConfiguration',
  scope: 'configuration',
})
  .defineContext(context)
  .implement(({ context }) => context.message) {}
