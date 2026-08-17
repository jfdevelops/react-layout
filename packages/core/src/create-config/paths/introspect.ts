import {
  isConfigNode,
  readComponentKeys,
  readSubResourceKeys,
} from '../component-keys';
import { MAX_PATH_DEPTH } from './generate';
import { readPathVariableName } from './variables';

/** Every branch below `node`, at any depth within the path depth cap. */
export function collectDescendantNodes(
  node: Record<string, unknown>,
  depth = MAX_PATH_DEPTH,
): Record<string, unknown>[] {
  if (depth === 0) {
    return [];
  }

  const nodes: Record<string, unknown>[] = [];

  for (const key of readSubResourceKeys(node)) {
    const subNode = node[key];

    if (!isConfigNode(subNode)) {
      continue;
    }

    nodes.push(subNode, ...collectDescendantNodes(subNode, depth - 1));
  }

  return nodes;
}

/** Sub-resource keys on `node` and below it, matching the values a nested param accepts. */
export function collectSubResourceKeysBelow(
  node: Record<string, unknown>,
  depth = MAX_PATH_DEPTH,
): string[] {
  const keys = new Set<string>(readSubResourceKeys(node));

  for (const descendant of collectDescendantNodes(node, depth)) {
    for (const key of readSubResourceKeys(descendant)) {
      keys.add(key);
    }
  }

  return [...keys];
}

/**
 * Whether the segments can be walked from `node`, treating variables as wildcards.
 * Used to narrow which resources a `$resource` path can target.
 */
export function pathExistsOnNode(
  node: unknown,
  segments: readonly string[],
): boolean {
  if (segments.length === 0) {
    return true;
  }

  if (!isConfigNode(node)) {
    return false;
  }

  const [segment, ...rest] = segments;

  if (segment === undefined) {
    return true;
  }

  const variableName = readPathVariableName(segment);

  if (variableName === 'subResource') {
    return collectDescendantNodes(node).some((descendant) =>
      pathExistsOnNode(descendant, rest),
    );
  }

  if (variableName === 'component') {
    return readComponentKeys(node).some((key) =>
      pathExistsOnNode(node[key], rest),
    );
  }

  if (variableName !== undefined) {
    return false;
  }

  const next = node[segment];

  return next !== undefined && pathExistsOnNode(next, rest);
}

/** Resource keys configured in a config map. */
export function collectConfigResources(
  config: Record<string, unknown>,
): string[] {
  return Object.keys(config).filter((key) => isConfigNode(config[key]));
}

/**
 * Resources a path can target. A `$resource` path keeps only the resources whose config
 * satisfies the path's fixed segments; a literal path keeps just that resource.
 */
export function collectPathResources(
  config: Record<string, unknown>,
  path: string,
): string[] {
  const [head, ...rest] = path.split('.');
  const resources = collectConfigResources(config);

  if (head === undefined) {
    return [];
  }

  if (readPathVariableName(head) === 'resource') {
    return resources.filter((resource) =>
      pathExistsOnNode(config[resource], rest),
    );
  }

  return resources.filter(
    (resource) => resource === head && pathExistsOnNode(config[resource], rest),
  );
}

/** Nodes a path's fixed prefix resolves to, stopping before `segments` runs out. */
function collectNodesForSegments(
  node: Record<string, unknown>,
  segments: readonly string[],
): Record<string, unknown>[] {
  let frontier: Record<string, unknown>[] = [node];

  for (const segment of segments) {
    const next: Record<string, unknown>[] = [];
    const variableName = readPathVariableName(segment);

    for (const current of frontier) {
      if (variableName === 'subResource') {
        next.push(...collectDescendantNodes(current));
        continue;
      }

      if (variableName === 'component') {
        for (const key of readComponentKeys(current)) {
          const value = current[key];

          if (isConfigNode(value)) {
            next.push(value);
          }
        }
        continue;
      }

      if (variableName !== undefined) {
        continue;
      }

      const value = current[segment];

      if (isConfigNode(value)) {
        next.push(value);
      }
    }

    frontier = next;
  }

  return frontier;
}

/** Sub-resource keys valid for the `$subResource` segment of a path. */
export function collectPathSubResourceKeys(
  config: Record<string, unknown>,
  path: string,
): string[] {
  const segments = path.split('.');
  const subResourceIndex = segments.findIndex(
    (segment) => readPathVariableName(segment) === 'subResource',
  );
  const keys = new Set<string>();

  for (const resource of collectPathResources(config, path)) {
    const resourceNode = config[resource];

    if (!isConfigNode(resourceNode)) {
      continue;
    }

    const prefix =
      subResourceIndex === -1 ? [] : segments.slice(1, subResourceIndex);

    for (const node of collectNodesForSegments(resourceNode, prefix)) {
      for (const key of collectSubResourceKeysBelow(node)) {
        keys.add(key);
      }
    }
  }

  return [...keys];
}

/** Component slot keys configured on the node a path resolves to. */
export function collectPathComponentKeys(
  config: Record<string, unknown>,
  path: string,
): string[] {
  const segments = path.split('.');
  const tail = segments.slice(1);
  const withoutTrailingComponent =
    readPathVariableName(tail.at(-1) ?? '') === 'component'
      ? tail.slice(0, -1)
      : tail;
  const keys = new Set<string>();

  for (const resource of collectPathResources(config, path)) {
    const resourceNode = config[resource];

    if (!isConfigNode(resourceNode)) {
      continue;
    }

    for (const node of collectNodesForSegments(
      resourceNode,
      withoutTrailingComponent,
    )) {
      for (const key of readComponentKeys(node)) {
        keys.add(key);
      }
    }
  }

  return [...keys];
}

/** Sub-resource keys configured for one resource, at any depth. */
export function collectResourceSubResourceKeys(
  config: Record<string, unknown>,
  resource: string,
): string[] {
  const resourceNode = config[resource];

  return isConfigNode(resourceNode)
    ? collectSubResourceKeysBelow(resourceNode)
    : [];
}

/** All sub-resource keys configured anywhere in a config map. */
export function collectAllSubResourceKeys(
  config: Record<string, unknown>,
): string[] {
  const keys = new Set<string>();

  for (const resource of collectConfigResources(config)) {
    for (const key of collectResourceSubResourceKeys(config, resource)) {
      keys.add(key);
    }
  }

  return [...keys];
}
