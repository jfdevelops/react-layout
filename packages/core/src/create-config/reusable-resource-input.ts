import type { LayoutResourcesAccessor } from './define-layout';
import type { ResourceDefinition } from '../resource';

export const singleResourceInput = Symbol('react-layout.single-resource-input');

/** Describes one configured resource path supplied by the reusable's caller. */
export type SingleResourceInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  readonly [singleResourceInput]: Resources;
};

/** Resource selector capabilities available to reusable definitions. */
export type ReusableResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = LayoutResourcesAccessor<Resources> & {
  single(): SingleResourceInput<Resources>;
};

export function isSingleResourceInput(
  value: unknown,
): value is SingleResourceInput<ReadonlyArray<ResourceDefinition>> {
  return (
    value !== null && typeof value === 'object' && singleResourceInput in value
  );
}

export function getResourcePaths(
  resources: ReadonlyArray<ResourceDefinition>,
  prefix = '',
) {
  const paths: string[] = [];
  for (const resource of resources) {
    const key = typeof resource === 'string' ? resource : resource.value;
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    if (typeof resource !== 'string') {
      paths.push(...getResourcePaths(resource.subResources, path));
    }
  }

  return paths;
}
