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

export type GetComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Options extends GetComponentOptions<Resources>>(
  options: Options,
) => JSX.Element;

export interface CreatedResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
> {
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

export function createGetComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(config: ResourceConfigMap<Resources>): GetComponent<Resources> {
  return (options) => {
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
  };
}

export function createResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(config: ResourceConfigMap<Resources>): CreatedResourceConfig<Resources> {
  return {
    getComponent: createGetComponent(config),
  };
}
