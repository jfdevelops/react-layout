import {
  createReactLayoutError,
  type ReactLayoutErrorContext,
} from './react-layout-error';

const scope = 'path' as const;

/** Context describing a path that is unavailable to React Layout. */
export interface InvalidPathContext
  extends ReactLayoutErrorContext<typeof scope> {
  path: unknown;
  validPaths?: readonly string[];
  reason?: string;
}

/** Thrown when a requested layout path is invalid or unavailable. */
export class InvalidPathError extends createReactLayoutError(
  { code: 'invalidPath', scope },
)((scope, { path, validPaths, reason }: InvalidPathContext) => {
  const quotedPath = JSON.stringify(path) ?? `"${String(path)}"`;
  const reasonMessage = reason ? ` ${reason}` : '';
  const validPathsMessage =
    validPaths && validPaths.length > 0
      ? ` Available paths are ${new Intl.ListFormat('en', {
          style: 'long',
          type: 'disjunction',
        }).format(validPaths)}.`
      : '';

  return `[${scope}]: Path ${quotedPath} is not available.${reasonMessage}${validPathsMessage}`;
}) {}
