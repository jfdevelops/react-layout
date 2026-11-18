import {
  capitalize,
  createString,
  type CapitalizeJoinOptions,
  type CapitalizeJoinContext,
} from '@jfdevelops/react-layout-internals';
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
    capitalize: function (
      this: RendererDisplayNamePath<string>,
      selected?:
        | string
        | {
            join:
              | CapitalizeJoinOptions
              | ((
                  context: CapitalizeJoinContext<
                    RendererDisplayNamePath<string>['segments']
                  >,
                ) => string);
          },
    ) {
      if (typeof selected === 'object') {
        if (typeof selected.join === 'function') {
          return selected.join({
            segments: this.segments,
            capitalize,
            create: createString,
          });
        }

        const formatter = {
          value: this.value,
          capitalize,
        };

        return formatter.capitalize({
          join: selected.join,
        });
      }

      const key = selected === undefined || selected === '*' ? value : selected;

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
