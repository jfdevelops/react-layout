import { createString } from './create-string';
import type { CheckedPath } from './path-completion';
import type { StringSelection } from './string-selection';

/** Helpers available when creating a custom joined display name. */
export interface CapitalizeJoinContext<Segments = unknown> {
  segments: Segments;
  capitalize: CapitalizeFn;
  create: typeof createString;
}

/** Controls dot-separated path joining in its original order. */
export interface CapitalizeJoinOptions {
  /** Removes dots between segments. Defaults to false. */
  removeDelimiter?: boolean;
  /** Capitalizes every segment instead of only the first. Defaults to false. */
  capitalizeSegments?: boolean;
}

type CapitalizedSegments<Path extends string> =
  Path extends `${infer Head}.${infer Tail}`
    ? `${Capitalize<Head>}.${CapitalizedSegments<Tail>}`
    : Capitalize<Path>;
type RemoveDelimiter<Path extends string> =
  Path extends `${infer Head}.${infer Tail}`
    ? `${Head}${RemoveDelimiter<Tail>}`
    : Path;

type CapitalizeWithFlag<Path extends string, Flag> = Flag extends true
  ? CapitalizedSegments<Path>
  : Capitalize<Path>;
type RemoveWithFlag<Path extends string, Flag> = Flag extends true
  ? RemoveDelimiter<Path>
  : Path;

/** Result of capitalizing and optionally joining a path's segments. */
export type CapitalizeJoinedPath<
  Path extends string,
  Options extends CapitalizeJoinOptions,
> = RemoveWithFlag<
  CapitalizeWithFlag<Path, Options['capitalizeSegments']>,
  Options['removeDelimiter']
>;

/** Capitalizes the current path, a selected path, or a wildcard-typed path string. */
export interface CapitalizeFn<
  Allowed extends string = string,
  Context = CapitalizeJoinContext,
> {
  <Current extends string>(this: {
    readonly value: Current;
  }): Capitalize<Current>;
  /**
   * Capitalizes a valid path. Passing '*' capitalizes the current path and types
   * the string as the union of all capitalized valid paths.
   * Suggestions follow the current path segment.
   */
  <const Selected extends string>(
    path: CheckedPath<StringSelection<Allowed>, Selected>,
  ): Capitalize<Selected extends '*' ? Allowed : Selected>;
  /** Formats the current path in path order, preserving its literal result. */
  <Current extends string, const Options extends CapitalizeJoinOptions>(
    this: { readonly value: Current },
    options: { join: Options },
  ): CapitalizeJoinedPath<Current, Options>;
  /** Creates a custom name from the current path's typed segments. */
  <const Result extends string>(options: {
    join: (context: Context) => Result;
  }): Result;
}

export const capitalize: CapitalizeFn = function <Value extends string>(
  this: { readonly value: Value; readonly segments?: unknown } | void,
  word?:
    | Value
    | {
        join:
          | CapitalizeJoinOptions
          | ((context: CapitalizeJoinContext) => string);
      },
) {
  if (typeof word === 'object') {
    if (typeof word.join === 'function') {
      return word.join({
        segments: this?.segments,
        capitalize,
        create: createString,
      }) as Capitalize<Value>;
    }

    const join = word.join;
    const segments = (this?.value ?? '').split('.');
    const words = segments.map((segment, index) =>
      join.capitalizeSegments || index === 0
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : segment,
    );

    return words.join(join.removeDelimiter ? '' : '.') as Capitalize<Value>;
  }

  const value =
    word === undefined || word === '*' ? (this?.value ?? word ?? '') : word;

  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<Value>;
};
