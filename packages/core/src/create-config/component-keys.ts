import { isValidElement } from 'react';
import type {
  BaseResourceConfigComponents,
  ResourceConfigComponentKey,
  SharedResourceConfigOptions,
} from './types';

/** Component slots that hold an element directly. */
export const COMPONENT_SLOT_KEYS = [
  'component',
  'errorComponent',
  'pendingComponent',
  'notFoundComponent',
] as const satisfies readonly (keyof BaseResourceConfigComponents)[];

/** Slots that hold their own set of component slots rather than an element. */
export const SHARED_BRANCH_KEYS = [
  'detail',
  'new',
] as const satisfies readonly (keyof SharedResourceConfigOptions)[];

export const RESOURCE_CONFIG_COMPONENT_KEYS = [
  ...COMPONENT_SLOT_KEYS,
  ...SHARED_BRANCH_KEYS,
] as const satisfies readonly ResourceConfigComponentKey[];

export type ComponentSlotKey = (typeof COMPONENT_SLOT_KEYS)[number];
export type SharedBranchKey = (typeof SHARED_BRANCH_KEYS)[number];

export function isComponentSlotKey(key: string): key is ComponentSlotKey {
  return (COMPONENT_SLOT_KEYS as readonly string[]).includes(key);
}

export function isSharedBranchKey(key: string): key is SharedBranchKey {
  return (SHARED_BRANCH_KEYS as readonly string[]).includes(key);
}

export function isResourceConfigComponentKey(
  key: string,
): key is ResourceConfigComponentKey {
  return (RESOURCE_CONFIG_COMPONENT_KEYS as readonly string[]).includes(key);
}

/**
 * Whether a config value is a branch that can be walked. Elements are leaves even
 * though they are objects, and arrays are never config branches.
 */
export function isConfigNode(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}

/** Component slots configured on a node, in declaration order. */
export function readComponentKeys(
  node: Record<string, unknown>,
): ResourceConfigComponentKey[] {
  return RESOURCE_CONFIG_COMPONENT_KEYS.filter(
    (key) => node[key] !== undefined,
  );
}

/** Sub-resource keys configured on a node: branch values under a non-component key. */
export function readSubResourceKeys(node: Record<string, unknown>): string[] {
  return Object.keys(node).filter(
    (key) => !isResourceConfigComponentKey(key) && isConfigNode(node[key]),
  );
}
