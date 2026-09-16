import type { JSX, ReactNode } from 'react';
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

/** Component slots a {@link ResourceConfigWrapper} can be scoped to with `applyTo`. */
export type ResourceConfigWrapperTarget = keyof BaseResourceConfigComponents;

/**
 * Wraps a config entry's component slots so the same JSX doesn't have to be repeated
 * around `component`, `errorComponent`, `pendingComponent`, and `notFoundComponent`
 * individually. A plain node wraps every configured slot on the entry; the
 * `{ applyTo, component }` form wraps only the listed slots.
 */
export type ResourceConfigWrapper =
  | ReactNode
  | {
      /** Which of this entry's component slots the wrapper applies to. */
      applyTo: ReadonlyArray<ResourceConfigWrapperTarget>;
      /** The wrapping element; the resolved component is rendered as its child. */
      component: ReactNode;
    };

/** Adds an optional {@link ResourceConfigWrapper} to a resource config entry. */
export type WithResourceConfigWrapper<Entry> = Entry & {
  wrapper?: ResourceConfigWrapper;
};

export type SharedResourceConfigOptions = {
  /**
   * Configuration for the new resource.
   */
  new?: WithResourceConfigWrapper<BaseResourceConfigComponents>;
  /**
   * Configuration for the detail resource.
   */
  detail?: WithResourceConfigWrapper<BaseResourceConfigComponents>;
};

export type ResourceConfigComponents =
  WithResourceConfigWrapper<BaseResourceConfigComponents> &
    SharedResourceConfigOptions;

/** Config keys that select a component or branch, i.e. everything but `wrapper`. */
export type ResourceConfigComponentKey = Exclude<
  keyof ResourceConfigComponents,
  'wrapper'
>;

/**
 * Config keys that cannot be used as nested sub-resource slugs. They already
 * name component slots (`component`, `errorComponent`, …), shared branches
 * (`detail`, `new`), or the `wrapper` slot. Top-level resource names may still
 * use these strings.
 */
type ReservedResourceSlug = ResourceConfigComponentKey | 'wrapper';

type ReservedResourceSlugMessage<Slug extends string> =
  `The resource slug "${Slug}" is reserved for config keys`;

type UnreservedResourceSlug<Slug extends string> = string extends Slug
  ? Slug
  : Slug extends ReservedResourceSlug
    ? ReservedResourceSlugMessage<Slug>
    : Slug;

type AssertUnreservedSubResourceDefinition<Resource> = Resource extends string
  ? UnreservedResourceSlug<Resource>
  : Resource extends {
        value: infer Value extends string;
        subResources: infer Subs;
      }
    ? Omit<Resource, 'value' | 'subResources'> & {
        value: UnreservedResourceSlug<Value>;
        subResources: Subs extends ReadonlyArray<unknown>
          ? {
              [Index in keyof Subs]: AssertUnreservedSubResourceDefinition<
                Subs[Index]
              >;
            }
          : Subs;
      }
    : Resource;

type AssertUnreservedResourceDefinition<Resource> = Resource extends string
  ? Resource
  : Resource extends {
        subResources: infer Subs;
      }
    ? Omit<Resource, 'subResources'> & {
        subResources: Subs extends ReadonlyArray<unknown>
          ? {
              [Index in keyof Subs]: AssertUnreservedSubResourceDefinition<
                Subs[Index]
              >;
            }
          : Subs;
      }
    : Resource;

export type AssertUnreservedResources<
  Resources extends ReadonlyArray<unknown>,
> = {
  [Index in keyof Resources]: AssertUnreservedResourceDefinition<
    Resources[Index]
  >;
};

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
