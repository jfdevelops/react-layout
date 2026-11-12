export type {
  BaseComponent,
  Show,
  ShowCallable,
  UnionToIntersection,
} from '@jfdevelops/react-layout-internals';
export type MergeIntersection<T> = {
  [Key in keyof T]: T[Key];
};
export type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;
export type Updater<T> = T | ((prev: T) => T);
export type OptionalRecord<K extends string, V = unknown> = {
  [key in K]?: V;
};

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]) {
  if (keys.length === 0) {
    return {} as Pick<T, K>;
  }

  return keys.reduce(
    (acc, key) => {
      if (key in obj) {
        acc[key] = obj[key];
      }

      return acc;
    },
    {} as Pick<T, K>,
  );
}

export function functionalUpdate<T>(value: T, updater: Updater<T>) {
  if (typeof updater === 'function') {
    return (updater as (prev: T) => T)(value);
  }

  return updater;
}
