export type Show<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : { [K in keyof T]: T[K] } & {};
export type MergeIntersection<T> = {
  [Key in keyof T]: T[Key];
};
export type IsUnion<T, U = T> = T extends unknown
  ? [U] extends [T]
    ? false
    : true
  : never;
export type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;
export type Updater<T> = T | ((prev: T) => T);

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

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]) {
  if (keys.length === 0) {
    return {} as Pick<T, K>;
  }

  return keys.reduce(
    (acc, key) => {
      if (key in obj) acc[key] = obj[key];

      return acc;
    },
    {} as Pick<T, K>,
  );
}

export function functionalUpdate<T>(value: T, updater: Updater<T>){
  if (typeof updater === 'function') {
    return (updater as (prev: T) => T)(value);
  }

  return updater;
}
