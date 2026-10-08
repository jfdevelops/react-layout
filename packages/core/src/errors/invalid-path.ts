import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  path: 'unknown',
  'reason?': 'string',
  scope: "'path'",
  'validPaths?': 'string[]',
});

export type InvalidPathContext = typeof context.infer;

/** Thrown when a requested layout path is invalid or unavailable. */
export class InvalidPathError extends createReactLayoutError({
  code: 'invalidPath',
  scope: 'path',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const quotedPath =
      JSON.stringify(context.path) ?? `"${String(context.path)}"`;
    const reasonMessage = context.reason ? ` ${context.reason}` : '';
    const validPathsMessage =
      context.validPaths && context.validPaths.length > 0
        ? ` Available paths are ${new Intl.ListFormat('en', {
            style: 'long',
            type: 'disjunction',
          }).format(context.validPaths)}.`
        : '';

    return `[${scope}]: Path ${quotedPath} is not available.${reasonMessage}${validPathsMessage}`;
  }) {}
