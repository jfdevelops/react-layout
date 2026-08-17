import type { JSX } from 'react';
import {
  InvalidComponentError,
  InvalidConfigError,
  InvalidPathError,
  InvalidResourceError,
  InvalidSubResourceError,
} from '../errors';
import type {
  LayoutResourceKey,
  ResourceDefinition,
  ResourceDefinitionForKey,
  SubResourceDefinitionsFor,
  SubResourceParamForResource,
} from '../resource';
import {
  createForPaths,
  createGetComponentForPath,
  type CreateGetComponentForPath,
  type ForPaths,
} from './for-paths';
import {
  createIsSubResourceKey,
  type IsSubResourceKey,
} from './is-sub-resource-key';
import {
  readComponentKeys,
  readSubResourceKeys,
} from './component-keys';
import {
  collectAllSubResourceKeys,
  collectConfigResources,
} from './paths';
import type {
  ConfigSubResourceKeys,
  ParameterizedResourcePath,
} from './paths';
import type {
  BaseResourceConfigComponents,
  ResourceConfigComponentKey,
  ResourceConfigComponents,
  ResourceConfigEntry,
  ResourceConfigMap,
  ResourceConfigInput,
  SharedResourceConfigOptions,
} from './types';

type ResourceHasLayoutSubResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = [SubResourceDefinitionsFor<Resources, Resource>] extends [readonly []]
  ? false
  : true;

type SubResourceOptionForGenerics<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
  SubResource extends
    | SubResourceParamForResource<Resources, Resource>
    | undefined,
> = [SubResource] extends [undefined]
  ? ResourceHasLayoutSubResources<Resources, Resource> extends true
    ? {
        subResource?: SubResourceParamForResource<Resources, Resource>;
      }
    : {}
  : ResourceHasLayoutSubResources<Resources, Resource> extends true
    ? { subResource?: SubResource }
    : {};

/** Options for one layout resource passed to {@link GetComponent}. */
export type GetComponentOptionsForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
  SubResource extends
    | SubResourceParamForResource<Resources, Resource>
    | undefined = undefined,
> = SubResourceOptionForGenerics<Resources, Resource, SubResource> & {
  resource: Resource;
  /**
   * The component to get.
   *
   * @default 'component'
   */
  component?: ResourceConfigComponentKey;
};

/** Union of valid `getComponent` option shapes for each declared layout resource. */
export type GetComponentOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
> =
  LayoutResourceKey<Resources> extends infer Resource
    ? Resource extends LayoutResourceKey<Resources>
      ? GetComponentOptionsForResource<Resources, Resource>
      : never
    : never;

type ComponentSlotPathKey = keyof BaseResourceConfigComponents;

/** `detail.errorComponent`, `new.component`, … — component slots inside a shared branch. */
type SharedBranchPath = {
  [Branch in keyof SharedResourceConfigOptions]: `${Branch}.${ComponentSlotPathKey}`;
}[keyof SharedResourceConfigOptions];

type NestedSubResourceDefinitions<Def extends ResourceDefinition> = Def extends {
  subResources: infer Nested extends ReadonlyArray<ResourceDefinition>;
}
  ? Nested
  : readonly [];

type SubResourceEntryPaths<
  SubDefs extends ReadonlyArray<ResourceDefinition>,
  DepthAcc extends readonly unknown[],
> =
  LayoutResourceKey<SubDefs> extends infer Key extends string
    ? Key extends LayoutResourceKey<SubDefs>
      ?
          | Key
          | `${Key}.${ResourceConfigEntryPath<
              NestedSubResourceDefinitions<
                ResourceDefinitionForKey<SubDefs, Key>
              >,
              readonly [...DepthAcc, unknown]
            >}`
      : never
    : never;

/** Dot-separated keys below one config node: component slots and nested sub-resources. */
type ResourceConfigEntryPath<
  SubDefs extends ReadonlyArray<ResourceDefinition>,
  DepthAcc extends readonly unknown[] = readonly [],
> =
  | ComponentSlotPathKey
  | SharedBranchPath
  | ([SubDefs] extends [readonly []]
      ? never
      : DepthAcc['length'] extends 6
        ? never
        : SubResourceEntryPaths<SubDefs, DepthAcc>);

/**
 * Deep config paths accepted by {@link GetComponent}, e.g.
 * `'templates.deleted.expired.errorComponent'`. Sub-resource segments come from the
 * layout tree, so only declared sub-resources are allowed at each depth.
 */
export type ResourceConfigPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
> =
  LayoutResourceKey<Resources> extends infer Resource extends string
    ? Resource extends LayoutResourceKey<Resources>
      ?
          | Resource
          | `${Resource}.${ResourceConfigEntryPath<
              SubResourceDefinitionsFor<Resources, Resource>
            >}`
      : never
    : never;

/** `subResource` bound by {@link GetComponentForResource}. */
export type SubResourceFromGetComponentBound<Bound> = Bound extends {
  subResource: infer SubResource;
}
  ? SubResource
  : undefined;

/** Options for {@link GetComponentForResource} — binds `resource` and optional `subResource`. */
export type GetComponentForResourceOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
  SubResource extends
    | SubResourceParamForResource<Resources, Resource>
    | undefined = undefined,
> = {
  resource: Resource;
} & SubResourceOptionForGenerics<Resources, Resource, SubResource>;

/** Valid bind shapes for {@link GetComponentForResource}. */
export type GetComponentForResourceBound<
  Resources extends ReadonlyArray<ResourceDefinition>,
> =
  LayoutResourceKey<Resources> extends infer Resource
    ? Resource extends LayoutResourceKey<Resources>
      ? GetComponentForResourceOptions<Resources, Resource>
      : never
    : never;

type GetComponentForResourceOptionsForBound<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Bound extends { resource: LayoutResourceKey<Resources> },
> = GetComponentForResourceOptions<
  Resources,
  Bound['resource'],
  SubResourceFromGetComponentBound<Bound>
>;

/**
 * Rejects bind objects with keys (e.g. `subResource`) that are invalid for the
 * given `resource`. Union assignability alone is too permissive for excess keys.
 */
export type ValidateForResourceBound<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Bound extends { resource: LayoutResourceKey<Resources> },
> = Bound extends GetComponentForResourceOptionsForBound<Resources, Bound>
  ? keyof Bound extends keyof GetComponentForResourceOptionsForBound<
      Resources,
      Bound
    >
    ? Bound
    : never
  : never;

/** `resource` inferred from a {@link GetComponentForResource} bind argument. */
export type ResourceFromGetComponentBound<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Bound,
> = Bound extends {
  resource: infer Resource extends LayoutResourceKey<Resources>;
}
  ? Resource
  : never;

/** Reusable getter returned by {@link GetComponentForResource} (only `component` remains). */
export type GetComponentAtBound<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
  SubResource extends
    | SubResourceParamForResource<Resources, Resource>
    | undefined = undefined,
> = (
  options?: Pick<
    GetComponentOptionsForResource<Resources, Resource, SubResource>,
    'component'
  >,
) => JSX.Element;

export type GetComponentForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <
  const Bound extends {
    resource: LayoutResourceKey<Resources>;
  },
>(
  bound: ValidateForResourceBound<Resources, Bound>,
) => GetComponentAtBound<
  Resources,
  ResourceFromGetComponentBound<Resources, Bound>,
  SubResourceFromGetComponentBound<Bound>
>;

export interface GetComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  /** Looks up a component by resource / optional sub-resource / optional component slot. */
  <const Options extends GetComponentOptions<Resources>>(
    options: Options,
  ): JSX.Element;
  /**
   * Looks up a component by a deep config path.
   * A path ending on a branch (e.g. `'templates.deleted.expired'`) returns that branch's
   * `component`; a path ending on a slot returns that slot.
   */
  <const Path extends ResourceConfigPath<Resources>>(path: Path): JSX.Element;
  forResource: GetComponentForResource<Resources>;
}

export interface CreatedResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends ResourceConfigMap<Resources> = ResourceConfigMap<Resources>,
> {
  config: Config;
  getComponent: GetComponent<Resources>;
  /**
   * Creates a reusable getter bound to one path. Variables the path leaves open become
   * the getter's arguments.
   *
   * @example
   * ```ts
   * const getDetail = createGetComponent('$resource.detail.$component');
   *
   * getDetail({ resource: 'templates', component: 'errorComponent' });
   * ```
   */
  createGetComponent: CreateGetComponentForPath<
    Resources,
    Config,
    ParameterizedResourcePath<Resources>
  >;
  /**
   * Builds a component for one or more paths. Declare which params the component takes,
   * then render it.
   *
   * @example
   * ```ts
   * const ResourceDetail = forPaths('$resource.detail.$component')
   *   .addPathParams()
   *   .render(({ params, getComponentForPath }) =>
   *     getComponentForPath('$resource.detail.$component')(params),
   *   );
   * ```
   */
  forPaths: ForPaths<
    Resources,
    Config,
    ParameterizedResourcePath<Resources>
  >;
  /** Narrows an unknown value to a sub-resource key configured for a path or resource. */
  isSubResourceKey: IsSubResourceKey<
    Resources,
    Config,
    ParameterizedResourcePath<Resources>
  >;
  /** Every sub-resource key configured in this config, at any depth. */
  subResources: ReadonlyArray<ConfigSubResourceKeys<Resources, Config>>;
}

type ComponentTypesFromEntry<Entry> = Entry extends JSX.Element
  ? never
  : Entry extends object
    ?
        | Extract<keyof Entry, ResourceConfigComponentKey>
        | {
            [Key in keyof Entry]: NonNullable<Entry[Key]> extends JSX.Element
              ? never
              : ComponentTypesFromEntry<NonNullable<Entry[Key]>>;
          }[keyof Entry]
    : never;

/**
 * Component selector keys actually defined anywhere in a created resource config.
 *
 * @example
 * ```ts
 * ComponentTypes<typeof resourceConfig>
 * // ^? may resolve to:`'component' | 'errorComponent' | 'detail'`.
 * ```
 */
export type ComponentTypes<Created> = Created extends {
  config: infer Config extends object;
}
  ? {
      [Resource in keyof Config]: ComponentTypesFromEntry<
        NonNullable<Config[Resource]>
      >;
    }[keyof Config]
  : never;

export type CreateResourceConfigFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Config extends ResourceConfigMap<Resources>>(
  config: ResourceConfigInput<Resources, Config>,
) => CreatedResourceConfig<Resources, Config>;

type SubResourceParam =
  | string
  | {
      value: string;
      subResource: SubResourceParam;
    };

function isResourceConfigEntry(value: unknown): value is ResourceConfigEntry {
  return typeof value === 'object' && value !== null;
}

function resolveResourceConfigEntry(
  entry: ResourceConfigEntry,
  subResource: SubResourceParam,
): ResourceConfigEntry {
  const key = typeof subResource === 'string' ? subResource : subResource.value;
  const next = entry[key];

  if (!isResourceConfigEntry(next)) {
    throw new InvalidSubResourceError({
      subResource: key,
      validSubResources: readSubResourceKeys(entry),
    });
  }

  if (typeof subResource === 'string') {
    return next;
  }

  return resolveResourceConfigEntry(next, subResource.subResource);
}

function readResourceConfigComponent(
  entry: ResourceConfigComponents,
  componentKey: ResourceConfigComponentKey,
): JSX.Element {
  if (componentKey === 'new' || componentKey === 'detail') {
    const branch = entry[componentKey];

    if (!branch?.component) {
      throw new InvalidComponentError({
        component: `${componentKey}.component`,
        validComponents: readComponentKeys(entry),
      });
    }

    return branch.component;
  }

  const value = entry[componentKey];

  if (!value) {
    throw new InvalidComponentError({
      component: componentKey,
      validComponents: readComponentKeys(entry),
    });
  }

  return value;
}

function getComponentFromOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(
  config: ResourceConfigMap<Resources>,
  options: GetComponentOptions<Resources>,
): JSX.Element {
  const { resource, component: componentKey = 'component' } = options;
  const resourceEntry = config[resource];

  if (!resourceEntry) {
    throw new InvalidResourceError({
      resource,
      validResources: collectConfigResources(config as Record<string, unknown>),
    });
  }

  let entry = resourceEntry as ResourceConfigEntry;

  if ('subResource' in options && options.subResource !== undefined) {
    entry = resolveResourceConfigEntry(entry, options.subResource);
  }

  return readResourceConfigComponent(entry, componentKey);
}

function getComponentFromPath<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(config: ResourceConfigMap<Resources>, path: string): JSX.Element {
  let cursor: unknown = config;

  for (const segment of path.split('.')) {
    if (!isResourceConfigEntry(cursor)) {
      throw new InvalidPathError({
        path,
        reason: `"${segment}" cannot be read because the value before it is not a config branch`,
      });
    }

    const next: unknown = (cursor as Record<string, unknown>)[segment];

    if (next === undefined || next === null) {
      throw new InvalidPathError({
        path,
        reason: `"${segment}" is not configured`,
      });
    }

    cursor = next;
  }

  if (isResourceConfigEntry(cursor) && 'component' in cursor) {
    return readResourceConfigComponent(cursor, 'component');
  }

  return cursor as JSX.Element;
}

export function createGetComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(config: ResourceConfigMap<Resources>): GetComponent<Resources> {
  function getComponent(options: GetComponentOptions<Resources>): JSX.Element;
  function getComponent(path: ResourceConfigPath<Resources>): JSX.Element;
  function getComponent(
    options: GetComponentOptions<Resources> | ResourceConfigPath<Resources>,
  ): JSX.Element {
    if (typeof options === 'string') {
      return getComponentFromPath(config, options);
    }

    return getComponentFromOptions(config, options);
  }

  const forResource: GetComponentForResource<Resources> = (bound) => {
    return (options) =>
      getComponentFromOptions(config, {
        ...bound,
        ...options,
      } as unknown as GetComponentOptions<Resources>);
  };

  return Object.assign(getComponent, { forResource });
}

export function createResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
  const Config extends ResourceConfigMap<Resources>,
>(
  config: ResourceConfigInput<Resources, Config>,
): CreatedResourceConfig<Resources, Config> {
  const configRecord = config as Record<string, unknown>;

  if (collectConfigResources(configRecord).length === 0) {
    throw new InvalidConfigError({
      reason: 'A resource config must configure at least one resource',
      config,
    });
  }

  type Created = CreatedResourceConfig<Resources, Config>;

  return {
    config,
    getComponent: createGetComponent(config),
    createGetComponent: ((path: string) =>
      createGetComponentForPath(
        configRecord,
        path,
      )) as unknown as Created['createGetComponent'],
    forPaths: createForPaths(configRecord) as unknown as Created['forPaths'],
    isSubResourceKey: createIsSubResourceKey(
      configRecord,
    ) as unknown as Created['isSubResourceKey'],
    subResources: collectAllSubResourceKeys(
      configRecord,
    ) as unknown as Created['subResources'],
  };
}
