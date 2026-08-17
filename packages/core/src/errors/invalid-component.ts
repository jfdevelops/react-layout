import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'component' as const;

/** Context describing an invalid or unconfigured component slot. */
export interface InvalidComponentContext
  extends ReactLayoutErrorContext<typeof scope> {
  component: unknown;
  path?: string;
  resource?: string;
  validComponents?: readonly string[];
  reason?: string;
}

/** Thrown when a requested component slot cannot be resolved. */
export class InvalidComponentError extends createReactLayoutError(
  { code: 'invalidComponent', scope },
)(
  (
    scope,
    {
      component,
      path,
      resource,
      validComponents,
      reason,
    }: InvalidComponentContext,
  ) => {
    const quotedComponent =
      JSON.stringify(component) ?? `"${String(component)}"`;
    const locationParts = [
      path ? `path "${path}"` : undefined,
      resource ? `resource "${resource}"` : undefined,
    ].filter((part): part is string => part !== undefined);
    const locationMessage =
      locationParts.length > 0 ? ` for ${locationParts.join(' and ')}` : '';
    const body =
      reason ??
      `Component slot ${quotedComponent}${locationMessage} is not configured.`;
    const validComponentsMessage =
      validComponents && validComponents.length > 0
        ? ` Available component slots are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(validComponents)}.`
        : '';

    return `[${scope}]: ${body}${validComponentsMessage}`;
  },
) {}
