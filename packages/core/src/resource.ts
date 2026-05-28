export type ResourceDefinition =
  | string
  | {
      value: string;
      subResources: ReadonlyArray<ResourceDefinition>;
    };

type MergeIntersection<T> = {
  [Key in keyof T]: T[Key];
};

type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

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
          subResources: infer SubResources extends ReadonlyArray<ResourceDefinition>;
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
