import { capitalize, createString } from '@jfdevelops/react-layout-internals';
import { InvalidPathError } from '../errors';
import type { RendererDisplayNamePath } from './renderer-types';

/** Creates a display-name path and lazily exposes its segment helpers. */
export function createDisplayNamePath(
  value: string,
  allowed: readonly string[],
): RendererDisplayNamePath<string> {
  return {
    value,
    get segments() {
      return Object.fromEntries(
        value
          .split('.')
          .map((segment) => [
            segment,
            createDisplayNamePath(segment, [segment]),
          ]),
      );
    },
    create: createString,
    is<const Path extends string>(
      path: Path,
    ): this is RendererDisplayNamePath<
      Extract<string, Path | `${Path}.${string}`>,
      string
    > {
      return value === path || value.startsWith(`${path}.`);
    },
    capitalize: function (this: { readonly value: string }, selected?: string) {
      const key =
        selected === undefined || selected === '*' ? this.value : selected;

      if (!allowed.includes(key)) {
        throw new InvalidPathError({
          path: key,
          validPaths: [...allowed],
        });
      }

      return capitalize(key);
    } as RendererDisplayNamePath<string>['capitalize'],
    toString: () => value,
  };
}
