export type CapitalizeFn = typeof capitalize;

export function capitalize<T extends string>(str: T): Capitalize<T>;
export function capitalize(str: string): string;
export function capitalize(...words: string[]) {
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}