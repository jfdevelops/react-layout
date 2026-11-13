import { createReactLayoutError } from './react-layout-error';

/** Thrown when `useResource` is called outside its resource provider. */
export class MissingResourceProviderError extends createReactLayoutError({
  code: 'missingResourceProvider',
  scope: 'resourceContext',
}).implement(
  ({ scope }) =>
    `[${scope}]: useResource must be called within its ResourceProvider.`,
) {}
