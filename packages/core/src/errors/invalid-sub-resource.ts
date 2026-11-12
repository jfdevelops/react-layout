import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface InvalidSubResourceContext {
  reason?: string;
  resource?: string;
  scope: 'subResource';
  subResource: unknown;
  validSubResources?: string[];
}

const context = createContextSchema<InvalidSubResourceContext>();

/** Thrown when a requested sub-resource is invalid or unavailable. */
export class InvalidSubResourceError extends createReactLayoutError({
  code: 'invalidSubResource',
  scope: 'subResource',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const quotedSubResource =
      JSON.stringify(context.subResource) ?? `"${String(context.subResource)}"`;
    const resourceMessage = context.resource ? ` for resource "${context.resource}"` : '';
    const reasonMessage = context.reason ? ` ${context.reason}` : '';
    const validSubResourcesMessage =
      context.validSubResources && context.validSubResources.length > 0
        ? ` Available sub-resources are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(context.validSubResources)}.`
        : '';

    return `[${scope}]: Sub-resource ${quotedSubResource}${resourceMessage} is not available.${reasonMessage}${validSubResourcesMessage}`;
  }) {}
