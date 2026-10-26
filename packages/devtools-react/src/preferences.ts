import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  defaultDevtoolsStorageKey,
  mergeDevtoolsPreferences,
  parseDevtoolsPreferences,
  serializeDevtoolsPreferences,
  type DevtoolsPreferences,
  type DevtoolsConfig,
} from '@jfdevelops/react-layout-devtools-core';
import type { PanelPreferences } from './use-floating-panel';
import type { ReactLayoutDevtoolsConfig } from './config';

export const defaultStorageKey = defaultDevtoolsStorageKey;
const changeEvent = 'react-layout-devtools:preferences-change';
const memory = new Map<string, string>();

type Preferences = DevtoolsPreferences & {
  fabPosition?: { x: number; y: number };
  panel?: PanelPreferences;
};

type PreferencesPatch = DevtoolsConfig &
  Pick<Preferences, 'fabPosition' | 'panel'>;

function read(key: string): string | null {
  try {
    return memory.get(key) ?? window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: Preferences) {
  const shared = JSON.parse(serializeDevtoolsPreferences(value));
  const serialized = JSON.stringify({
    ...shared,
    fabPosition: value.fabPosition,
    panel: value.panel,
  });

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
  const shared: Preferences = parseDevtoolsPreferences(raw, defaults);

  try {
    const saved = JSON.parse(raw ?? '{}');
    const point = saved?.fabPosition;
    const panel = saved?.panel;

    if (
      panel &&
      [panel.x, panel.y, panel.width, panel.height].every(
        (value) => typeof value === 'number' && Number.isFinite(value)
      ) &&
      panel.width > 0 &&
      panel.height > 0 &&
      ['floating', 'docked', 'expanded'].includes(panel.mode)
    ) {
      shared.panel = {
        x: panel.x,
        y: panel.y,
        width: panel.width,
        height: panel.height,
        mode: panel.mode,
      };
    }

    if (
      point &&
      typeof point.x === 'number' &&
      Number.isFinite(point.x) &&
      typeof point.y === 'number' &&
      Number.isFinite(point.y)
    ) {
      return { ...shared, fabPosition: { x: point.x, y: point.y } };
    }
  } catch {
    // Invalid adapter-specific data falls back to the default FAB placement.
  }

  return shared;
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

  function update(patch: PreferencesPatch) {
    const current = resolve(read(key), defaults);
    const fabPosition =
      'fabPosition' in patch ? patch.fabPosition : current.fabPosition;

    const panel = 'panel' in patch ? patch.panel : current.panel;

    write(key, {
      ...mergeDevtoolsPreferences(current, patch),
      fabPosition,
      panel,
    });
  }

  function reset() {
    write(key, resolve(null, defaults));
  }

  return [preferences, update, reset] as const;
}
