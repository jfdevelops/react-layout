type FirstSegment<Path extends string> = Path extends `${infer Head}.${string}`
  ? Head
  : Path;

type PathSuggestions<
  Allowed extends string,
  Input extends string,
> = Input extends `${infer Head}.${infer Rest}`
  ? `${Head}.${PathSuggestions<
      Allowed extends `${Head}.${infer Tail}` ? Tail : never,
      Rest
    >}`
  : FirstSegment<Allowed>;

/** Completes the current segment while checking the entire supplied path. */
export type CheckedPath<
  Allowed extends string,
  Input extends string,
> = string extends Allowed
  ? Input
  : Input extends Allowed
    ? Input
    : Input extends PathSuggestions<Allowed, Input>
      ? never
      : PathSuggestions<Allowed, Input>;
