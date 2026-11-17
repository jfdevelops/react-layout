/** Selects one member of a string set, or every member with '*'. */
export type StringSelection<Key extends string> = Key | '*';

/** Resolves one selected value, or the caller's wildcard result. */
export type StringSelectionResult<
  Values,
  Selected,
  Wildcard = Values,
> = Selected extends '*'
  ? Wildcard
  : Selected extends keyof Values
    ? Values[Selected]
    : never;

/** Handles one key or '*'; callers define wildcard behavior and runtime validation. */
export function resolveStringSelection<
  Values extends Record<string, unknown>,
  const Selected extends StringSelection<keyof Values & string>,
  Wildcard = Values,
>(
  keys: readonly (keyof Values & string)[],
  selected: Selected,
  resolve: <Key extends keyof Values & string>(key: Key) => Values[Key],
  resolveAll: (keys: readonly (keyof Values & string)[]) => Wildcard,
): StringSelectionResult<Values, Selected, Wildcard> {
  const result =
    selected === '*'
      ? resolveAll(keys)
      : resolve(selected as keyof Values & string);

  return result as StringSelectionResult<Values, Selected, Wildcard>;
}
