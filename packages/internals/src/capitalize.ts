import type { CheckedPath } from './path-completion';
import type { StringSelection } from './string-selection';

/** Capitalizes the current path, a selected path, or a wildcard-typed path string. */
export interface CapitalizeFn<Allowed extends string = string> {
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
}

export const capitalize: CapitalizeFn = function <Value extends string>(
  this: { readonly value: Value } | void,
  word?: Value,
) {
  const value =
    word === undefined || word === '*' ? (this?.value ?? word ?? '') : word;

  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<Value>;
};
