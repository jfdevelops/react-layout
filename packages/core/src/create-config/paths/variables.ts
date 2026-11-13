/**
 * Prefix marking a path segment as a caller-supplied variable. `'$resource.detail.$component'`
 * leaves `resource` and `component` open, while `detail` is fixed.
 */
export const PATH_VARIABLE_IDENTIFIER = '$';

export type PathVariableIdentifier = typeof PATH_VARIABLE_IDENTIFIER;

/** A single variable path segment, e.g. `PathVariable<'resource'>` is `'$resource'`. */
export type PathVariable<Name extends string> =
  `${PathVariableIdentifier}${Name}`;

export type ResourcePathVariable = PathVariable<'resource'>;
export type SubResourcePathVariable = PathVariable<'subResource'>;
export type ComponentPathVariable = PathVariable<'component'>;

/** Variable names a path may leave open. */
export type PathVariableName = 'resource' | 'subResource' | 'component';

export type RemovePathVariableIdentifier<Segment extends string> =
  Segment extends PathVariable<infer Name> ? Name : Segment;

type ExtractSegmentVariable<Segment extends string> =
  Segment extends PathVariable<infer Name> ? Name : never;

/**
 * Variable names declared by a dot-separated path.
 *
 * @example
 * ```ts
 * ExtractPathVariables<'$resource.detail.$component'>
 * // ^? 'resource' | 'component'
 * ```
 */
export type ExtractPathVariables<Path extends string> =
  Path extends `${infer Segment}.${infer Rest}`
    ? ExtractSegmentVariable<Segment> | ExtractPathVariables<Rest>
    : ExtractSegmentVariable<Path>;

/** Whether `Path` leaves any variable open. */
export type PathHasVariables<Path extends string> = [
  ExtractPathVariables<Path>,
] extends [never]
  ? false
  : true;

/** First segment of a dot-separated path. */
export type PathHead<Path extends string> =
  Path extends `${infer Head}.${string}` ? Head : Path;

/** Everything after the first segment of a dot-separated path (`''` when there is nothing left). */
export type PathTail<Path extends string> =
  Path extends `${string}.${infer Rest}` ? Rest : '';

export function createPathVariable<Name extends string>(
  name: Name,
): PathVariable<Name> {
  return `${PATH_VARIABLE_IDENTIFIER}${name}`;
}

export function isPathVariableSegment(segment: string): boolean {
  return segment.startsWith(PATH_VARIABLE_IDENTIFIER);
}

/** Variable name for a segment, or `undefined` when the segment is a fixed key. */
export function readPathVariableName(segment: string): string | undefined {
  return isPathVariableSegment(segment)
    ? segment.slice(PATH_VARIABLE_IDENTIFIER.length)
    : undefined;
}

/** Variable names declared by `path`, in order of appearance and without duplicates. */
export function extractPathVariables(path: string): string[] {
  const names = new Set<string>();

  for (const segment of path.split('.')) {
    const name = readPathVariableName(segment);

    if (name !== undefined && name.length > 0) {
      names.add(name);
    }
  }

  return [...names];
}

export function pathHasVariables(path: string): boolean {
  return extractPathVariables(path).length > 0;
}
