import { expect, it } from 'vitest';
import {
  defaultDevtoolsPreferences,
  defaultDevtoolsStorageKey,
  initialGraphZoom,
  mergeDevtoolsPreferences,
  parseDevtoolsPreferences,
  resolveChipColors,
  resolveDevtoolsPreferences,
  serializeDevtoolsPreferences,
} from '../src';

it('shares defaults and accepts the existing preference schema without a browser', () => {
  expect(parseDevtoolsPreferences(null)).toEqual(defaultDevtoolsPreferences);
  expect(defaultDevtoolsStorageKey).toBe(
    'react-layout-devtools:preferences:v1'
  );

  const saved = JSON.stringify({
    initialView: 'tree',
    initialZoom: 1.5,
    initialFilters: { activeOnly: true },
    tree: { initialExpanded: false },
  });
  const preferences = parseDevtoolsPreferences(saved);

  expect(preferences.initialView).toBe('tree');
  expect(preferences.initialZoom).toBe(1.5);
  expect(preferences.initialFilters).toEqual({
    activeOnly: true,
    showComposables: false,
  });
  expect(preferences.tree).toEqual({
    initialExpanded: false,
    stickyScopes: true,
  });
});

it('validates persisted settings and uses caller defaults for invalid values', () => {
  const defaults = {
    initialView: 'tree' as const,
    initialZoom: 1.5,
    showDetails: false,
    chipColors: { active: 'lime' },
  };
  const preferences = resolveDevtoolsPreferences(
    {
      initialView: 'invalid',
      initialZoom: Infinity,
      showDetails: 'yes',
      initialFilters: { activeOnly: 'true' },
      tree: [],
      chipColors: { active: { color: 12 }, unknown: 'red', resource: 'tomato' },
    },
    defaults
  );

  expect(preferences.initialView).toBe('tree');
  expect(preferences.initialZoom).toBe(1.5);
  expect(preferences.showDetails).toBe(false);
  expect(preferences.initialFilters.activeOnly).toBe(false);
  expect(preferences.chipColors).toEqual({
    active: 'lime',
    resource: 'tomato',
  });
  expect(resolveDevtoolsPreferences({ initialZoom: 40 }).initialZoom).toBe(2);
  expect(parseDevtoolsPreferences('{broken', defaults)).toEqual(
    resolveDevtoolsPreferences(undefined, defaults)
  );
});

it('merges nested preferences by key and resets through the same defaults', () => {
  const defaults = {
    initialFilters: { showComposables: true },
    tree: { stickyScopes: false },
    chipColors: { active: 'lime' },
  };
  const original = resolveDevtoolsPreferences(undefined, defaults);
  const updated = mergeDevtoolsPreferences(original, {
    initialFilters: { activeOnly: true },
    tree: { initialExpanded: false },
    chipColors: { resource: 'tomato' },
  });

  expect(updated.initialFilters).toEqual({
    activeOnly: true,
    showComposables: true,
  });
  expect(updated.tree).toEqual({ initialExpanded: false, stickyScopes: false });
  expect(updated.chipColors).toEqual({ active: 'lime', resource: 'tomato' });
  expect(original.initialFilters.activeOnly).toBe(false);
  expect(parseDevtoolsPreferences(null, defaults)).toEqual(original);
});

it('serializes only preferences and leaves session state, preview commands and adapter settings out', () => {
  const preferences = {
    ...resolveDevtoolsPreferences({ initialView: 'tree' }),
    query: 'secret search',
    selectedNode: 'state:1',
    forcedState: 'Loading',
    instances: [],
    fabPosition: { x: 2, y: 4 },
  };
  const serialized = serializeDevtoolsPreferences(preferences);

  expect(JSON.parse(serialized)).toEqual(
    resolveDevtoolsPreferences({ initialView: 'tree' })
  );
  expect(serialized).not.toContain('secret search');
  expect(parseDevtoolsPreferences(serialized)).toEqual(
    resolveDevtoolsPreferences({ initialView: 'tree' })
  );
});

it('shares palette resolution and zoom bounds across adapters', () => {
  expect(
    resolveChipColors({
      active: { color: 'var(--active)', background: 'var(--background)' },
    }).active
  ).toEqual({ color: 'var(--active)', background: 'var(--background)' });
  expect(resolveChipColors({ resource: 'tomato' }).resource.background).toBe(
    'color-mix(in srgb, tomato 10%, transparent)'
  );
  expect(initialGraphZoom(NaN)).toBe(1);
  expect(initialGraphZoom(10)).toBe(2);
  expect(initialGraphZoom(-10)).toBe(0.25);
});
