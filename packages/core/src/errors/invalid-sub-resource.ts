import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'subResource' as const;

/** Context describing an unavailable sub-resource and its owning resource. */
export interface InvalidSubResourceContext
  extends ReactLayoutErrorContext<typeof scope> {
  subResource: unknown;
  resource?: string;
  validSubResources?: readonly string[];
  reason?: string;
}

/** Thrown when a requested sub-resource is invalid or unavailable. */
export class InvalidSubResourceError extends createReactLayoutError(
  { code: 'invalidSubResource', scope },
)(
  (
    scope,
    {
      subResource,
      resource,
      validSubResources,
      reason,
    }: InvalidSubResourceContext,
  ) => {
    const quotedSubResource =
      JSON.stringify(subResource) ?? `"${String(subResource)}"`;
    const resourceMessage = resource ? ` for resource "${resource}"` : '';
    const reasonMessage = reason ? ` ${reason}` : '';
    const validSubResourcesMessage =
      validSubResources && validSubResources.length > 0
        ? ` Available sub-resources are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(validSubResources)}.`
        : '';

    return `[${scope}]: Sub-resource ${quotedSubResource}${resourceMessage} is not available.${reasonMessage}${validSubResourcesMessage}`;
  },
) {}
