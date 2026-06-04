import { ReactNode } from 'react';
import { NonEmptyReadonlyArray } from './validators';
import { MergeIntersection, UnionToIntersection } from './utils';

export type ResourceDefinition =
  | string
  | {
      value: string;
      subResources: ReadonlyArray<
        ResourceDefinition & {
          /**
           * Whether to allow any string as a sub resource.
           *
           * @default false
           */
          allowAnyString?: boolean;
        }
      >;
    };

export type ResourceTree = Record<
  string,
  {
    subResources: ResourceTree;
  }
>;

export type NormalizeResource<Resource extends ResourceDefinition> =
  Resource extends string
    ? {
        [Key in Resource]: {
          subResources: {};
        };
      }
    : Resource extends {
          value: infer Value extends string;
          subResources: infer SubResources extends
            ReadonlyArray<ResourceDefinition>;
        }
      ? {
          [Key in Value]: {
            subResources: NormalizeResources<SubResources>;
          };
        }
      : never;

export type NormalizeResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = MergeIntersection<
  UnionToIntersection<NormalizeResource<Resources[number]>>
>;
export type ResourceLayoutComponentProps = {
  children: ReactNode;
};

function normalizeResourceTree(resource: ResourceDefinition): ResourceTree {
  if (typeof resource === 'string') {
    return {
      [resource]: {
        subResources: {},
      },
    };
  }

  const { value, subResources } = resource;

  return {
    [value]: {
      subResources: normalizeResourcesTree(subResources),
    },
  };
}

function normalizeResourcesTree(
  resources: ReadonlyArray<ResourceDefinition>,
): ResourceTree {
  const normalizedResources: ResourceTree = {};

  for (const resource of resources) {
    Object.assign(normalizedResources, normalizeResourceTree(resource));
  }

  return normalizedResources;
}

export function normalizeResource(resource: ResourceDefinition): ResourceTree {
  return normalizeResourceTree(resource);
}

export function normalizeResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): NormalizeResources<Resources> {
  return normalizeResourcesTree(resources) as NormalizeResources<Resources>;
}

type ResourceDefinitionValue<Resource extends ResourceDefinition> =
  Resource extends string
    ? Resource
    : Resource extends { value: infer Value extends string }
      ? Value
  : never;

  /**
   * Top-level resource names declared in a `resources` array. Preserves string
   * literal unions for const resource definitions (unlike `keyof` on the
   * normalized resource tree, which tends to widen to `string` in hovers).
  */
export type LayoutResourceKey<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = ResourceDefinitionValue<Resources[number]>;

export type ResourceDefinitionForKey<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Key extends string,
> = Extract<Resources[number], Key | { value: Key }>;

/** `subResources` array declared on a layout resource. */
export type SubResourceDefinitionsFor<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = ResourceDefinitionForKey<Resources, Resource> extends {
  subResources: infer SubResources extends ReadonlyArray<ResourceDefinition>;
}
  ? SubResources
  : readonly [];

type CanNestSubResourceParam<
  MaxDepth extends number,
  DepthAcc extends readonly unknown[],
> = [...DepthAcc, unknown]['length'] extends MaxDepth ? false : true;

/**
 * `subResource` route param: a slug at the current depth, or `{ resource, subResource }`
 * when that slug has nested `subResources` in the layout tree and `MaxDepth` allows it.
 */
export type RecursiveSubResourceParam<
  Resources extends ReadonlyArray<ResourceDefinition>,
  SubDefs extends ReadonlyArray<ResourceDefinition>,
  MaxDepth extends number = 6,
  DepthAcc extends readonly unknown[] = readonly [],
> = LayoutResourceKey<SubDefs> extends infer Key
  ? Key extends LayoutResourceKey<SubDefs>
    ? CanNestSubResourceParam<MaxDepth, DepthAcc> extends true
      ? ResourceDefinitionForKey<SubDefs, Key> extends {
          subResources: infer Nested extends ReadonlyArray<ResourceDefinition>;
        }
        ? [LayoutResourceKey<Nested>] extends [never]
          ? Key
          :
              | Key
              | {
                  resource: Key;
                  subResource: RecursiveSubResourceParam<
                    Resources,
                    Nested,
                    MaxDepth,
                    readonly [...DepthAcc, unknown]
                  >;
                }
        : Key
      : Key
    : never
  : never;

/** Recursive `subResource` values for a layout resource (full tree depth). */
export type SubResourceParamForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = [SubResourceDefinitionsFor<Resources, Resource>] extends [readonly []]
  ? never
  : RecursiveSubResourceParam<
      Resources,
      SubResourceDefinitionsFor<Resources, Resource>
    >;

export type GetSubResourceKeys<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Resource extends LayoutResourceKey<Resources>,
> = ResourceDefinitionForKey<Resources, Resource> extends {
  subResources: infer SubResources extends ReadonlyArray<ResourceDefinition>;
}
  ? LayoutResourceKey<SubResources>
  : never;
export type ResourceEnum<Resources extends ReadonlyArray<ResourceDefinition>> =
  NonEmptyReadonlyArray<LayoutResourceKey<Resources>>;
export function toResourceEnum<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: NormalizeResources<Resources>) {
  const keys = Object.keys(resources);

  if (keys.length === 0) {
    throw new Error('No resources provided');
  }

  return keys as unknown as ResourceEnum<Resources>;
}
