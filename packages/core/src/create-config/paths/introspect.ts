import {
  isConfigNode,
  readComponentKeys,
  readSubResourceKeys,
} from '../component-keys';
import { MAX_PATH_DEPTH } from './generate';
import { readPathVariableName } from './variables';

function visitDescendantNodes(
  node: Record<string, unknown>,
  depth: number,
  visit: (node: Record<string, unknown>) => boolean,
): boolean {
  if (depth === 0) {
    return false;
  }

  for (const key of readSubResourceKeys(node)) {
    const child = node[key];

    if (
      isConfigNode(child) &&
      (visit(child) || visitDescendantNodes(child, depth - 1, visit))
    ) {
      return true;
    }
  }

  return false;
}

/** Every branch below `node`, at any depth within the path depth cap. */
export function collectDescendantNodes(
  node: Record<string, unknown>,
  depth = MAX_PATH_DEPTH,
): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  visitDescendantNodes(node, depth, (child) => {
    nodes.push(child);

    return false;
  });

  return nodes;
}

/** Sub-resource keys on `node` and below it, matching the values a nested param accepts. */
export function collectSubResourceKeysBelow(
  node: Record<string, unknown>,
  depth = MAX_PATH_DEPTH,
): string[] {
  const keys = new Set<string>();

  collectSubResourceKeysInto(node, depth, keys);

  return [...keys];
}

function collectSubResourceKeysInto(
  node: Record<string, unknown>,
  depth: number,
  keys: Set<string>,
): void {
  const children = readSubResourceKeys(node);

  for (const key of children) {
    keys.add(key);
  }

  if (depth === 0) {
    return;
  }

  for (const key of children) {
    const child = node[key];

    if (isConfigNode(child)) {
      collectSubResourceKeysInto(child, depth - 1, keys);
    }
  }
}

/**
 * Whether the segments can be walked from `node`, treating variables as wildcards.
 * Used to narrow which resources a `$resource` path can target.
 */
export function pathExistsOnNode(
  node: unknown,
  segments: readonly string[],
): boolean {
  return pathExistsAtSegment(node, segments, 0);
}

function pathExistsAtSegment(
  node: unknown,
  segments: readonly string[],
  index: number,
): boolean {
  if (index === segments.length) {
    return true;
  }

  if (!isConfigNode(node)) {
    return false;
  }

  const segment = segments[index];

  if (segment === undefined) {
    return true;
  }

  const variableName = readPathVariableName(segment);

  if (variableName === 'subResource') {
    return visitDescendantNodes(node, MAX_PATH_DEPTH, (descendant) =>
      pathExistsAtSegment(descendant, segments, index + 1),
    );
  }

  if (variableName === 'component') {
    return readComponentKeys(node).some((key) =>
      pathExistsAtSegment(node[key], segments, index + 1),
    );
  }

  if (variableName !== undefined) {
    return false;
  }

  const next = node[segment];

  return next !== undefined && pathExistsAtSegment(next, segments, index + 1);
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
  segments: readonly string[] = path.split('.'),
): string[] {
  const head = segments[0];

  if (head === undefined) {
    return [];
  }

  if (readPathVariableName(head) === 'resource') {
    return collectConfigResources(config).filter((resource) =>
      pathExistsAtSegment(config[resource], segments, 1),
    );
  }

  if (!Object.prototype.propertyIsEnumerable.call(config, head)) {
    return [];
  }

  const node = config[head];

  return isConfigNode(node) && pathExistsAtSegment(node, segments, 1)
    ? [head]
    : [];
}

/** Collects requested validation categories together while matching one path. */
export function collectPathValidationSets(
  config: Record<string, unknown>,
  path: string,
  targets: {
    resources?: Set<string>;
    subResources?: Set<string>;
    components?: Set<string>;
  },
): void {
  const segments = path.split('.');
  const head = segments[0];
  const subResourceIndex = segments.findIndex(
    (segment) => readPathVariableName(segment) === 'subResource',
  );
  const componentIndex =
    readPathVariableName(segments.at(-1) ?? '') === 'component'
      ? segments.length - 1
      : segments.length;
  const candidates =
    readPathVariableName(head ?? '') === 'resource'
      ? collectConfigResources(config)
      : head !== undefined &&
          Object.prototype.propertyIsEnumerable.call(config, head)
        ? [head]
        : [];

  for (const resource of candidates) {
    const root = config[resource];

    if (!isConfigNode(root)) {
      continue;
    }

    if (!targets.subResources && !targets.components) {
      if (pathExistsAtSegment(root, segments, 1)) {
        targets.resources?.add(resource);
      }

      continue;
    }

    const subResources = new Set<string>();
    const components = new Set<string>();

    function descendants(
      node: Record<string, unknown>,
      depth: number,
      nextIndex: number,
      includeSubResources: boolean,
    ): boolean {
      if (depth === 0 && !includeSubResources) {
        return false;
      }

      const keys = readSubResourceKeys(node);
      let exists = false;

      if (includeSubResources) {
        for (const key of keys) {
          subResources.add(key);
        }
      }

      if (depth === 0) {
        return false;
      }

      for (const key of keys) {
        const child = node[key];

        if (isConfigNode(child)) {
          // Both calls must run: matching gathers slots; descent gathers nested slugs.
          const matches = match(child, nextIndex);
          const nestedMatches = descendants(
            child,
            depth - 1,
            nextIndex,
            includeSubResources,
          );
          exists = matches || nestedMatches || exists;
        }
      }

      return exists;
    }

    function match(node: unknown, index: number): boolean {
      const variable = readPathVariableName(segments[index] ?? '');
      const isNode = isConfigNode(node);
      const keys =
        isNode &&
        (variable === 'component' ||
          (targets.components && index === componentIndex))
          ? readComponentKeys(node)
          : [];

      if (targets.components && index === componentIndex) {
        for (const key of keys) {
          components.add(key);
        }
      }

      if (index === segments.length) {
        return true;
      }

      if (!isNode) {
        return false;
      }

      const segment = segments[index];

      if (segment === undefined) {
        return true;
      }

      if (variable === 'subResource') {
        return descendants(
          node,
          MAX_PATH_DEPTH,
          index + 1,
          !!targets.subResources && index === subResourceIndex,
        );
      }

      if (variable === 'component') {
        let exists = false;

        for (const key of keys) {
          exists = match(node[key], index + 1) || exists;
        }

        return exists;
      }

      if (variable !== undefined) {
        return false;
      }

      return node[segment] !== undefined && match(node[segment], index + 1);
    }

    if (!match(root, 1)) {
      continue;
    }

    targets.resources?.add(resource);

    for (const key of subResources) {
      targets.subResources?.add(key);
    }

    for (const key of components) {
      targets.components?.add(key);
    }
  }
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
        visitDescendantNodes(current, MAX_PATH_DEPTH, (descendant) => {
          next.push(descendant);

          return false;
        });
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
  resources: readonly string[] = collectPathResources(config, path),
  segments: readonly string[] = path.split('.'),
): string[] {
  const subResourceIndex = segments.findIndex(
    (segment) => readPathVariableName(segment) === 'subResource',
  );
  const keys = new Set<string>();
  const prefix =
    subResourceIndex === -1 ? [] : segments.slice(1, subResourceIndex);

  for (const resource of resources) {
    const resourceNode = config[resource];

    if (!isConfigNode(resourceNode)) {
      continue;
    }

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
  resources: readonly string[] = collectPathResources(config, path),
  segments: readonly string[] = path.split('.'),
): string[] {
  const tail = segments.slice(1);
  const withoutTrailingComponent =
    readPathVariableName(tail.at(-1) ?? '') === 'component'
      ? tail.slice(0, -1)
      : tail;
  const keys = new Set<string>();

  for (const resource of resources) {
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
