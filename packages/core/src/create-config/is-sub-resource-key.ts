import type { ResourceDefinition } from '../resource';
import {
  collectPathSubResourceKeys,
  collectResourceSubResourceKeys,
} from './paths';
import type {
  ConfigResourceKeys,
  PathSubResourceKeys,
  ResourceSubResourceKeys,
} from './paths';

/** Either a path whose `$subResource` segment supplies the valid keys, or one resource. */
export type IsSubResourceKeyOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  AllowedPath extends string,
> =
  | { path: AllowedPath; resource?: never }
  | { resource: ConfigResourceKeys<Resources, Config>; path?: never };

export type IsSubResourceKeyResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Options,
> = Options extends { path: infer Path extends string }
  ? PathSubResourceKeys<Resources, Config, Path>
  : Options extends { resource: infer Resource }
    ? ResourceSubResourceKeys<Config, Resource>
    : never;

/**
 * Narrows an unknown value to a configured sub-resource key.
 *
 * @example
 * ```ts
 * if (isSubResourceKey(slug, { resource: 'templates' })) {
 *   // slug is 'deleted' | 'expired'
 * }
 * ```
 */
export type IsSubResourceKey<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  AllowedPath extends string,
> = <
  const Options extends IsSubResourceKeyOptions<Resources, Config, AllowedPath>,
>(
  key: unknown,
  options: Options,
) => key is IsSubResourceKeyResult<Resources, Config, Options>;

export function createIsSubResourceKey(config: Record<string, unknown>) {
  return (
    key: unknown,
    options: { path?: string; resource?: string },
  ): boolean => {
    if (typeof key !== 'string') {
      return false;
    }

    if (options.path !== undefined) {
      return collectPathSubResourceKeys(config, options.path).includes(key);
    }

    if (options.resource !== undefined) {
      return collectResourceSubResourceKeys(config, options.resource).includes(
        key,
      );
    }

    return false;
  };
}
