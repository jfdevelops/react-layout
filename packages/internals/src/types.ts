/**
 * Flattens an object type for display. Use {@link ShowCallable} when the type
 * may carry call signatures, which a mapped type does not preserve.
 */
export type Show<T> = { [K in keyof T]: T[K] } & {};

/**
 * Like {@link Show}, but keeps the call signature of callable types.
 */
export type ShowCallable<T> = T extends (...args: infer Arguments) => infer Result
  ? ((...args: Arguments) => Result) & { [Key in keyof T]: T[Key] }
  : Show<T>;

export type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];

export type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

export interface BaseComponent<Name extends string, Props = {}> {
  /**
   * The name of the component. Useful for debugging and error messages.
   */
  displayName: Name;
  /**
   * A type only property to get the type of the props. At runtime,
   * this is `undefined`.
   */
  props: Props;
}
