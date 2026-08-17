import type { JSX } from 'react';
import type { ResourceDefinition } from '../../resource';
import { isConfigNode } from '../component-keys';
import {
  collectPathComponentKeys,
  collectPathResources,
  collectPathSubResourceKeys,
  collectResourceSubResourceKeys,
  extractPathVariables,
  resolveParameterizedPath,
} from '../paths';
import type {
  ExtractPathVariables,
  PathComponentKeys,
  PathHasVariables,
  PathResourceCandidates,
  PathSubResourceKeys,
  PathVariables,
  PathVariableValues,
  ResolveParameterizedPathValue,
  ResourceSubResourceKeys,
} from '../paths';

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never;

type ValueOfKeyInUnion<Value, Key> = Value extends unknown
  ? Key extends keyof Value
    ? Value[Key]
    : never
  : never;

export interface PathValueComponentGetter<Value> {
  /**
   * Reads one component slot from the resolved node. Configured slots auto-complete
   * while any string stays allowed; unknown slots resolve to `null`.
   */
  getComponent<
    Key extends KeysOfUnion<Value> | (string & {}),
    Component = ValueOfKeyInUnion<Value, Key>,
  >(
    componentKey: Key,
  ): [Component] extends [never] ? null : Component;
}

/**
 * Value a path resolves to. Branch nodes gain a slot reader; component slots resolve to
 * the element itself. The slot reader is attached once to the whole node union so it
 * stays callable when several resources remain possible.
 */
export type ResolvedPathValue<Value> = [Extract<Value, JSX.Element>] extends [
  never,
]
  ? [Extract<Value, object>] extends [never]
    ? Value
    : Extract<Value, object> & PathValueComponentGetter<Extract<Value, object>>
  : [Exclude<Value, JSX.Element>] extends [never]
    ? Extract<Value, JSX.Element>
    : Extract<Value, JSX.Element> | ResolvedPathValue<Exclude<Value, JSX.Element>>;

type PathVariableDomain<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
  Name,
> = Name extends 'resource'
  ? PathResourceCandidates<Resources, Config, Path>
  : Name extends 'subResource'
    ? PathSubResourceKeys<Resources, Config, Path>
    : Name extends 'component'
      ? PathComponentKeys<Resources, Config, Path>
      : never;

/** One guard per variable the path leaves open, e.g. `getTemplate.resource.isVariable(x)`. */
export type PathVariableGuards<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> = {
  [Name in ExtractPathVariables<Path>]: {
    /** Narrows a value to what this variable accepts for this path. */
    isVariable: (
      key: unknown,
    ) => key is PathVariableDomain<Resources, Config, Path, Name>;
  };
};

export interface GetComponentForPathApi<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> {
  /** The path this getter reads. */
  readonly path: Path;
  /** Variable names this path leaves open, in order of appearance. */
  readonly variables: ReadonlyArray<ExtractPathVariables<Path>>;
  /** Resources this path can target. */
  readonly resources: ReadonlyArray<
    PathResourceCandidates<Resources, Config, Path>
  >;
  isResource: (
    key: unknown,
  ) => key is PathResourceCandidates<Resources, Config, Path>;
  isSubResource: (
    key: unknown,
  ) => key is PathSubResourceKeys<Resources, Config, Path>;
  isComponent: (
    key: unknown,
  ) => key is PathComponentKeys<Resources, Config, Path>;
  /** Narrows a sub-resource against one specific resource rather than the whole path. */
  isValidSubResource: <
    Resource extends PathResourceCandidates<Resources, Config, Path>,
  >(
    resource: Resource,
    subResource: unknown,
  ) => subResource is ResourceSubResourceKeys<Config, Resource>;
}

type GetComponentForPathCallable<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> =
  PathHasVariables<Path> extends true
    ? (
        variables: PathVariables<Resources, Config, Path>,
      ) => ResolvedPathValue<
        ResolveParameterizedPathValue<
          Resources,
          Config,
          Path,
          PathVariables<Resources, Config, Path>
        >
      >
    : () => ResolvedPathValue<
        ResolveParameterizedPathValue<Resources, Config, Path, {}>
      >;

/**
 * Reusable getter bound to one path. Call it with the variables the path left open.
 *
 * @example
 * ```ts
 * const getDetail = createGetComponent('$resource.detail.$component');
 *
 * getDetail({ resource: 'templates', component: 'errorComponent' });
 * ```
 */
export type GetComponentForPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  Path extends string,
> = GetComponentForPathCallable<Resources, Config, Path> &
  GetComponentForPathApi<Resources, Config, Path> &
  PathVariableGuards<Resources, Config, Path>;

export type CreateGetComponentForPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config,
  AllowedPath extends string,
> = <const Path extends AllowedPath>(
  path: Path,
) => GetComponentForPath<Resources, Config, Path>;

const componentGetters = new WeakMap<object, object>();

/**
 * Attaches a slot reader to a branch node without mutating the config. Wrappers are
 * cached so repeated reads of the same node stay referentially stable.
 */
function attachComponentGetter(value: unknown): unknown {
  if (!isConfigNode(value)) {
    return value;
  }

  const cached = componentGetters.get(value);

  if (cached !== undefined) {
    return cached;
  }

  const wrapper = {
    ...value,
    getComponent(componentKey: string) {
      return componentKey in value ? value[componentKey] : null;
    },
  };

  componentGetters.set(value, wrapper);

  return wrapper;
}

export function createGetComponentForPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends Record<string, unknown>,
  Path extends string,
>(config: Config, path: Path): GetComponentForPath<Resources, Config, Path> {
  const variableNames = extractPathVariables(path);
  const resources = collectPathResources(config, path);
  const subResourceKeys = collectPathSubResourceKeys(config, path);
  const componentKeys = collectPathComponentKeys(config, path);

  function getComponentForPath(variables?: PathVariableValues) {
    return attachComponentGetter(
      resolveParameterizedPath(config, path, variables ?? {}),
    );
  }

  const isResource = (key: unknown) =>
    typeof key === 'string' && resources.includes(key);
  const isSubResource = (key: unknown) =>
    typeof key === 'string' && subResourceKeys.includes(key);
  const isComponent = (key: unknown) =>
    typeof key === 'string' && componentKeys.includes(key);

  const guardForVariable = (name: string) => {
    if (name === 'resource') {
      return isResource;
    }

    if (name === 'subResource') {
      return isSubResource;
    }

    return isComponent;
  };

  const variableGuards = Object.fromEntries(
    variableNames.map((name) => [name, { isVariable: guardForVariable(name) }]),
  );

  return Object.assign(
    getComponentForPath,
    {
      path,
      variables: variableNames,
      resources,
      isResource,
      isSubResource,
      isComponent,
      isValidSubResource: (resource: string, subResource: unknown) =>
        typeof subResource === 'string' &&
        collectResourceSubResourceKeys(config, resource).includes(subResource),
    },
    variableGuards,
  ) as unknown as GetComponentForPath<Resources, Config, Path>;
}
