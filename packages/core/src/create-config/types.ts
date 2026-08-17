import type { JSX } from 'react';
import type {
  LayoutResourceKey,
  ResourceDefinition,
  ResourceDefinitionForKey,
  SubResourceDefinitionsFor,
} from '../resource';

export type BaseResourceConfigComponents = {
  component: JSX.Element;
  errorComponent?: JSX.Element;
  pendingComponent?: JSX.Element;
  notFoundComponent?: JSX.Element;
};

/** Optional component slots that map to their own path segment (not {@link BaseResourceConfigComponents.component}). */
export type ResourceComponentPathKey = Exclude<
  keyof BaseResourceConfigComponents,
  'component'
>;

export type SharedResourceConfigOptions = {
  /**
   * Configuration for the new resource.
   */
  new?: BaseResourceConfigComponents;
  /**
   * Configuration for the detail resource.
   */
  detail?: BaseResourceConfigComponents;
};

export type ResourceConfigComponents = BaseResourceConfigComponents &
  SharedResourceConfigOptions;

export type ResourceConfigComponentKey = keyof ResourceConfigComponents;

/**
 * Config entry for one sub-resource node. Nested sub-resources are keyed directly by
 * their layout slug (there is no `subResources` wrapper in the config).
 */
export type SubResourceConfigComponentsFor<
  Resources extends ReadonlyArray<ResourceDefinition>,
  SubDef extends ResourceDefinition,
> = ResourceConfigComponents &
  (SubDef extends {
    subResources: infer Nested extends ReadonlyArray<ResourceDefinition>;
  }
    ? {
        [K in LayoutResourceKey<Nested>]?: SubResourceConfigComponentsFor<
          Resources,
          ResourceDefinitionForKey<Nested, K>
        >;
      }
    : {});

export type SubResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = [SubResourceDefinitionsFor<Resources, Resource>] extends [readonly []]
  ? {}
  : {
      [K in LayoutResourceKey<
        SubResourceDefinitionsFor<Resources, Resource>
      >]?: SubResourceConfigComponentsFor<
        Resources,
        ResourceDefinitionForKey<
          SubResourceDefinitionsFor<Resources, Resource>,
          K
        >
      >;
    };

export type ResourceConfig<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  [resource in LayoutResourceKey<Resources>]: ResourceConfigComponents &
    SubResourceConfig<Resources, resource>;
};

/**
 * Parameter type for {@link CreateResourceConfigFn}. Intersects the inferred `Config`
 * with the full optional resource map so editors can suggest keys while `Config`
 * stays narrowed to the keys and values you actually pass.
 */
export type ResourceConfigInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Config extends Partial<ResourceConfig<Resources>>,
> = Partial<ResourceConfig<Resources>> & Config;

export type ResourceConfigMap<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = Partial<ResourceConfig<Resources>>;

/** Runtime view of a config node: component slots plus arbitrary sub-resource keys. */
export type ResourceConfigEntry = ResourceConfigComponents & {
  [subResource: string]: unknown;
};
