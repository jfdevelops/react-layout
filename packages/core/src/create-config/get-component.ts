import type { JSX } from 'react';
import type {
  LayoutResourceKey,
  ResourceDefinition,
  SubResourceDefinitionsFor,
  SubResourceParamForResource,
} from '../resource';
import type {
  ResourceConfigComponentKey,
  ResourceConfigComponents,
  ResourceConfigEntry,
  ResourceConfigMap,
  ResourceConfigInput,
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
  <const Options extends GetComponentOptions<Resources>>(
    options: Options,
  ): JSX.Element;
  forResource: GetComponentForResource<Resources>;
}

export interface CreatedResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
  config: ResourceConfigMap<Resources>;
  getComponent: GetComponent<Resources>;
}

export type CreateResourceConfigFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Config extends ResourceConfigMap<Resources>>(
  config: ResourceConfigInput<Resources, Config>,
) => CreatedResourceConfig<Resources>;

type SubResourceParam =
  | string
  | {
      resource: string;
      subResource: SubResourceParam;
    };

function resolveResourceConfigEntry(
  entry: ResourceConfigEntry,
  subResource: SubResourceParam,
): ResourceConfigEntry {
  if (typeof subResource === 'string') {
    const next = entry.subResources?.[subResource];
    if (!next) {
      throw new Error(`Sub-resource "${subResource}" is not configured`);
    }
    return next;
  }

  const next = entry.subResources?.[subResource.resource];
  if (!next) {
    throw new Error(`Sub-resource "${subResource.resource}" is not configured`);
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
      throw new Error(`Missing "${componentKey}.component" configuration`);
    }

    return branch.component;
  }

  const value = entry[componentKey];

  if (!value) {
    throw new Error(`Missing "${componentKey}" configuration`);
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
    throw new Error(`Resource "${resource}" is not configured`);
  }

  let entry: ResourceConfigEntry = resourceEntry;

  if ('subResource' in options && options.subResource !== undefined) {
    entry = resolveResourceConfigEntry(entry, options.subResource);
  }

  return readResourceConfigComponent(entry, componentKey);
}

export function createGetComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(config: ResourceConfigMap<Resources>): GetComponent<Resources> {
  function getComponent<const Options extends GetComponentOptions<Resources>>(
    options: Options,
  ) {
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
>(config: ResourceConfigMap<Resources>): CreatedResourceConfig<Resources> {
  return {
    config,
    getComponent: createGetComponent(config),
  };
}
