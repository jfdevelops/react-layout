import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  'reason?': 'string',
  resource: 'unknown',
  scope: "'resource'",
  'validResources?': 'string[]',
});

export type InvalidResourceContext = typeof context.infer;

/** Thrown when a requested layout resource is invalid or unavailable. */
export class InvalidResourceError extends createReactLayoutError({
  code: 'invalidResource',
  scope: 'resource',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const quotedResource =
      JSON.stringify(context.resource) ?? `"${String(context.resource)}"`;
    const reasonMessage = context.reason ? ` ${context.reason}` : '';
    const validResourcesMessage =
      context.validResources && context.validResources.length > 0
        ? ` Available resources are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(context.validResources)}.`
        : '';

    return `[${scope}]: Resource ${quotedResource} is not available.${reasonMessage}${validResourcesMessage}`;
  }) {}
