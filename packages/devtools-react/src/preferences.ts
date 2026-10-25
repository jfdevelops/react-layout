import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  initialGraphZoom,
  type ReactLayoutDevtoolsConfig,
  type DevtoolsChipKind,
} from './config';

export const defaultStorageKey = 'react-layout-devtools:preferences:v1';
const changeEvent = 'react-layout-devtools:preferences-change';
const memory = new Map<string, string>();
type Preferences = Required<
  Omit<ReactLayoutDevtoolsConfig, 'tree' | 'initialFilters'>
> & {
  tree: { stickyScopes: boolean; initialExpanded: boolean };
  initialFilters: { activeOnly: boolean; showComposables: boolean };
  fabPosition?: { x: number; y: number };
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function read(key: string): string | null {
  try {
    return memory.get(key) ?? window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}
function write(key: string, value: Preferences) {
  const serialized = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, serialized);
    memory.delete(key);
  } catch {
    memory.set(key, serialized);
  }
  window.dispatchEvent(new Event(changeEvent));
}
function resolve(
  raw: string | null,
  defaults?: ReactLayoutDevtoolsConfig
): Preferences {
  let saved: Record<string, unknown> = {};
  try {
    saved = record(JSON.parse(raw ?? '{}'));
  } catch {
    /* Invalid storage falls back to caller defaults. */
  }
  const filters = record(saved.initialFilters),
    tree = record(saved.tree),
    point = record(saved.fabPosition);
  const boolean = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;
  const colors: ReactLayoutDevtoolsConfig['chipColors'] = {
    ...defaults?.chipColors,
  };
  for (const [kind, value] of Object.entries(record(saved.chipColors))) {
    const entry = record(value);
    if (typeof value === 'string') colors[kind as DevtoolsChipKind] = value;
    else if (
      typeof entry.color === 'string' &&
      (entry.background === undefined || typeof entry.background === 'string')
    )
      colors[kind as DevtoolsChipKind] = {
        color: entry.color,
        background: entry.background as string | undefined,
      };
  }
  return {
    chipColors: colors,
    initialView:
      saved.initialView === 'graph' || saved.initialView === 'tree'
        ? saved.initialView
        : defaults?.initialView ?? 'graph',
    initialZoom: initialGraphZoom(
      typeof saved.initialZoom === 'number'
        ? saved.initialZoom
        : defaults?.initialZoom
    ),
    initialFilters: {
      activeOnly: boolean(
        filters.activeOnly,
        defaults?.initialFilters?.activeOnly ?? false
      ),
      showComposables: boolean(
        filters.showComposables,
        defaults?.initialFilters?.showComposables ?? false
      ),
    },
    tree: {
      stickyScopes: boolean(
        tree.stickyScopes,
        defaults?.tree?.stickyScopes ?? true
      ),
      initialExpanded: boolean(
        tree.initialExpanded,
        defaults?.tree?.initialExpanded ?? true
      ),
    },
    showDetails: boolean(saved.showDetails, defaults?.showDetails ?? true),
    ...(typeof point.x === 'number' &&
    Number.isFinite(point.x) &&
    typeof point.y === 'number' &&
    Number.isFinite(point.y)
      ? { fabPosition: { x: point.x, y: point.y } }
      : {}),
  };
}
/** Storage is authoritative; all inspectors in this origin update together. */
export function usePanelPreferences(
  defaults?: ReactLayoutDevtoolsConfig,
  key = defaultStorageKey
) {
  const raw = useSyncExternalStore(
    useMemo(
      () => (listener: () => void) => {
        const storage = (event: StorageEvent) => {
          if (event.key === key || event.key === null) {
            memory.delete(key);
            listener();
          }
        };
        window.addEventListener('storage', storage);
        window.addEventListener(changeEvent, listener);
        return () => {
          window.removeEventListener('storage', storage);
          window.removeEventListener(changeEvent, listener);
        };
      },
      [key]
    ),
    () => read(key),
    () => null
  );
  const preferences = useMemo(() => resolve(raw, defaults), [raw, defaults]);
  useEffect(() => {
    if (raw === null && read(key) === null) write(key, preferences);
  }, [raw, key, preferences]);
  function update(patch: Partial<Preferences>) {
    write(key, { ...resolve(read(key), defaults), ...patch });
  }
  function reset() {
    write(key, resolve(null, defaults));
  }
  return [preferences, update, reset] as const;
}
