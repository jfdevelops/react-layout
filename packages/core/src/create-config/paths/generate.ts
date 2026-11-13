import {
  COMPONENT_SLOT_KEYS,
  isConfigNode,
  readComponentKeys,
  readSubResourceKeys,
  SHARED_BRANCH_KEYS,
} from '../component-keys';
import {
  createPathVariable,
  type ComponentPathVariable,
  type ResourcePathVariable,
  type SubResourcePathVariable,
} from './variables';

/** Recursion cap for generated paths. Must stay aligned with `MaxPathDepth` in `./types`. */
export const MAX_PATH_DEPTH = 6;

const RESOURCE_VARIABLE: ResourcePathVariable = createPathVariable('resource');
const SUB_RESOURCE_VARIABLE: SubResourcePathVariable =
  createPathVariable('subResource');
const COMPONENT_VARIABLE: ComponentPathVariable =
  createPathVariable('component');

/** Component tails on one node: its slots, its shared branches, and `$component`. */
function collectComponentTails(node: Record<string, unknown>): string[] {
  const tails: string[] = [];

  for (const key of COMPONENT_SLOT_KEYS) {
    if (node[key] !== undefined) {
      tails.push(key);
    }
  }

  if (readComponentKeys(node).length > 0) {
    tails.push(COMPONENT_VARIABLE);
  }

  for (const branch of SHARED_BRANCH_KEYS) {
    const branchNode = node[branch];

    if (!isConfigNode(branchNode)) {
      continue;
    }

    tails.push(branch);

    for (const key of COMPONENT_SLOT_KEYS) {
      if (branchNode[key] !== undefined) {
        tails.push(`${branch}.${key}`);
      }
    }

    if (readComponentKeys(branchNode).length > 0) {
      tails.push(`${branch}.${COMPONENT_VARIABLE}`);
    }
  }

  return tails;
}

/**
 * Component tails valid after a `$subResource` segment: one variable stands for the whole
 * sub-resource chain, so every descendant's tails are reachable.
 */
function collectDescendantComponentTails(
  node: Record<string, unknown>,
  depth: number,
): string[] {
  if (depth === 0) {
    return [];
  }

  const tails = new Set<string>();

  for (const key of readSubResourceKeys(node)) {
    const subNode = node[key];

    if (!isConfigNode(subNode)) {
      continue;
    }

    for (const tail of collectComponentTails(subNode)) {
      tails.add(tail);
    }

    for (const tail of collectDescendantComponentTails(subNode, depth - 1)) {
      tails.add(tail);
    }
  }

  return [...tails];
}

/** Every path tail valid below one config node. */
function collectEntryPaths(
  node: Record<string, unknown>,
  depth: number,
): string[] {
  if (depth === 0) {
    return [];
  }

  const paths = new Set<string>(collectComponentTails(node));
  const subResourceKeys = readSubResourceKeys(node);

  if (subResourceKeys.length > 0) {
    paths.add(SUB_RESOURCE_VARIABLE);

    for (const tail of collectDescendantComponentTails(node, depth)) {
      paths.add(`${SUB_RESOURCE_VARIABLE}.${tail}`);
    }
  }

  for (const key of subResourceKeys) {
    const subNode = node[key];

    paths.add(key);

    if (!isConfigNode(subNode)) {
      continue;
    }

    for (const nested of collectEntryPaths(subNode, depth - 1)) {
      paths.add(`${key}.${nested}`);
    }
  }

  return [...paths];
}

/**
 * Paths a config accepts, with resource and sub-resource segments available both as
 * literals and as variables. Runtime twin of `ParameterizedResourcePath`.
 */
export function generateResourceConfigPaths(
  config: Record<string, unknown>,
): string[] {
  const paths = new Set<string>();

  for (const resource of Object.keys(config)) {
    const resourceNode = config[resource];

    if (!isConfigNode(resourceNode)) {
      continue;
    }

    paths.add(resource);
    paths.add(RESOURCE_VARIABLE);

    for (const tail of collectEntryPaths(resourceNode, MAX_PATH_DEPTH)) {
      paths.add(`${resource}.${tail}`);
      paths.add(`${RESOURCE_VARIABLE}.${tail}`);
    }
  }

  return [...paths];
}
