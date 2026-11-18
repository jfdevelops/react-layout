/** Concatenates string parts while preserving literal and union types. */
export type JoinedStrings<Parts extends readonly string[]> =
  Parts extends readonly [
    infer Head extends string,
    ...infer Tail extends string[],
  ]
    ? `${Head}${JoinedStrings<Tail>}`
    : number extends Parts['length']
      ? string
      : '';

/** Builds a name without widening literal parts to string. */
export function createString<const Parts extends readonly string[]>(
  ...parts: Parts
): JoinedStrings<Parts> {
  return parts.join('') as JoinedStrings<Parts>;
}
