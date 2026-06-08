export type Show<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : { [K in keyof T]: T[K] } & {};

export type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

export interface BaseComponent<Name extends string, Props = {}> {
  displayName: Name;
  props: Props;
}
