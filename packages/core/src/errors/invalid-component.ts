import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  component: 'unknown',
  'path?': 'string',
  'reason?': 'string',
  'resource?': 'string',
  scope: "'component'",
  'validComponents?': 'string[]',
});

export type InvalidComponentContext = typeof context.infer;

/** Thrown when a requested component slot cannot be resolved. */
export class InvalidComponentError extends createReactLayoutError({
  code: 'invalidComponent',
  scope: 'component',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const quotedComponent =
      JSON.stringify(context.component) ?? `"${String(context.component)}"`;
    const locationParts = [
      context.path ? `path "${context.path}"` : undefined,
      context.resource ? `resource "${context.resource}"` : undefined,
    ].filter((part): part is string => part !== undefined);
    const locationMessage =
      locationParts.length > 0 ? ` for ${locationParts.join(' and ')}` : '';
    const body =
      context.reason ??
      `Component slot ${quotedComponent}${locationMessage} is not configured.`;
    const validComponentsMessage =
      context.validComponents && context.validComponents.length > 0
        ? ` Available component slots are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(context.validComponents)}.`
        : '';

    return `[${scope}]: ${body}${validComponentsMessage}`;
  }) {}
