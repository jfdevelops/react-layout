import {
  defaultNodeColors,
  initialGraphZoom,
  type DevtoolsConfig,
  type DevtoolsChipKind,
} from './config';

/** Kept stable so existing React adapter preferences also work with other adapters. */
export const defaultDevtoolsStorageKey = 'react-layout-devtools:preferences:v1';

export interface DevtoolsPreferences {
  chipColors: NonNullable<DevtoolsConfig['chipColors']>;
  initialView: 'graph' | 'tree';
  initialZoom: number;
  initialFilters: { activeOnly: boolean; showComposables: boolean };
  tree: { stickyScopes: boolean; initialExpanded: boolean };
  showDetails: boolean;
}

/** Transient view state. Never serialized as preferences. */
export interface DevtoolsSessionState {
  query: string;
  selectedNode?: string;
}

export const defaultDevtoolsPreferences: Readonly<DevtoolsPreferences> =
  Object.freeze({
    chipColors: Object.freeze({}),
    initialView: 'graph',
    initialZoom: 1,
    initialFilters: Object.freeze({
      activeOnly: false,
      showComposables: false,
    }),
    tree: Object.freeze({ stickyScopes: true, initialExpanded: true }),
    showDetails: true,
  });

const chipKinds = new Set<string>([
  ...Object.keys(defaultNodeColors),
  'active',
  'inactive',
  'unresolved',
  'loading',
  'error',
  'reference',
  'required',
  'optional',
  'included',
  'custom',
  'component',
  'config',
]);

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function colors(value: unknown): DevtoolsPreferences['chipColors'] {
  const result: DevtoolsPreferences['chipColors'] = {};

  for (const [kind, color] of Object.entries(record(value))) {
    if (!chipKinds.has(kind)) continue;

    const entry = record(color);

    if (typeof color === 'string' && color.trim()) {
      result[kind as DevtoolsChipKind] = color;
    } else if (
      typeof entry.color === 'string' &&
      entry.color.trim() &&
      (entry.background === undefined || typeof entry.background === 'string')
    ) {
      result[kind as DevtoolsChipKind] = {
        color: entry.color,
        ...(typeof entry.background === 'string'
          ? { background: entry.background }
          : {}),
      };
    }
  }

  return result;
}

function resolve(
  value: unknown,
  fallback: Readonly<DevtoolsPreferences>
): DevtoolsPreferences {
  const saved = record(value);
  const filters = record(saved.initialFilters);
  const tree = record(saved.tree);

  return {
    chipColors: { ...fallback.chipColors, ...colors(saved.chipColors) },
    initialView:
      saved.initialView === 'graph' || saved.initialView === 'tree'
        ? saved.initialView
        : fallback.initialView,
    initialZoom:
      typeof saved.initialZoom === 'number' &&
      Number.isFinite(saved.initialZoom)
        ? initialGraphZoom(saved.initialZoom)
        : fallback.initialZoom,
    initialFilters: {
      activeOnly: boolean(
        filters.activeOnly,
        fallback.initialFilters.activeOnly
      ),
      showComposables: boolean(
        filters.showComposables,
        fallback.initialFilters.showComposables
      ),
    },
    tree: {
      stickyScopes: boolean(tree.stickyScopes, fallback.tree.stickyScopes),
      initialExpanded: boolean(
        tree.initialExpanded,
        fallback.tree.initialExpanded
      ),
    },
    showDetails: boolean(saved.showDetails, fallback.showDetails),
  };
}

/** Validate stored values, with caller configuration used for missing or invalid fields. */
export function resolveDevtoolsPreferences(
  value: unknown,
  defaults?: DevtoolsConfig
): DevtoolsPreferences {
  return resolve(value, resolve(defaults, defaultDevtoolsPreferences));
}

export function parseDevtoolsPreferences(
  raw: string | null,
  defaults?: DevtoolsConfig
): DevtoolsPreferences {
  try {
    return resolveDevtoolsPreferences(JSON.parse(raw ?? '{}'), defaults);
  } catch {
    return resolveDevtoolsPreferences(undefined, defaults);
  }
}

/** Merge nested settings by key; invalid patch fields retain their previous values. */
export function mergeDevtoolsPreferences(
  current: DevtoolsPreferences,
  patch: DevtoolsConfig
): DevtoolsPreferences {
  return resolveDevtoolsPreferences(patch, current);
}

/** Serialize only the shared schema, excluding session state and adapter-specific values. */
export function serializeDevtoolsPreferences(
  preferences: DevtoolsPreferences
): string {
  return JSON.stringify(resolveDevtoolsPreferences(preferences));
}
