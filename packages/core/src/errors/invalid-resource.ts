import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'resource' as const;

/** Context describing a resource that is unavailable to React Layout. */
export interface InvalidResourceContext
  extends ReactLayoutErrorContext<typeof scope> {
  resource: unknown;
  validResources?: readonly string[];
  reason?: string;
}

/** Thrown when a requested layout resource is invalid or unavailable. */
export class InvalidResourceError extends createReactLayoutError(
  { code: 'invalidResource', scope },
)((scope, { resource, validResources, reason }: InvalidResourceContext) => {
  const quotedResource = JSON.stringify(resource) ?? `"${String(resource)}"`;
  const reasonMessage = reason ? ` ${reason}` : '';
  const validResourcesMessage =
    validResources && validResources.length > 0
      ? ` Available resources are ${new Intl.ListFormat('en', {
          style: 'long',
          type: 'disjunction',
        }).format(validResources)}.`
      : '';

  return `[${scope}]: Resource ${quotedResource} is not available.${reasonMessage}${validResourcesMessage}`;
}) {}
