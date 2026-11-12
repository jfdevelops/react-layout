import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface InvalidPathContext {
  path: unknown;
  reason?: string;
  scope: 'path';
  validPaths?: string[];
}

const context = createContextSchema<InvalidPathContext>();

/** Thrown when a requested layout path is invalid or unavailable. */
export class InvalidPathError extends createReactLayoutError({
  code: 'invalidPath',
  scope: 'path',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const quotedPath = JSON.stringify(context.path) ?? `"${String(context.path)}"`;
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
