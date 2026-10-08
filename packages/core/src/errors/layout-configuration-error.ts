import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type('string').pipe((message) => ({
  message,
  scope: 'configuration',
}));

export type LayoutConfigurationErrorContext = typeof context.infer;

/** Thrown when a layout or resource configuration cannot be used. */
export class LayoutConfigurationError extends createReactLayoutError({
  code: 'layoutConfiguration',
  scope: 'configuration',
})
  .defineContext(context)
  .implement(({ context }) => context.message) {}
