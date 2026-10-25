import type { GraphNode } from '@jfdevelops/react-layout-devtools-core';
import { colors } from './theme';

export type DevtoolsChipKind =
  | GraphNode['kind']
  | 'active'
  | 'inactive'
  | 'unresolved'
  | 'reference'
  | 'required'
  | 'optional'
  | 'included'
  | 'custom'
  | 'component'
  | 'config';
export type DevtoolsChipColor = string | { color: string; background?: string };
export interface ReactLayoutDevtoolsConfig {
  /** Partial overrides. Accepts CSS colors, including variables and named colors. */
  chipColors?: Partial<Record<DevtoolsChipKind, DevtoolsChipColor>>;
  /** Defaults used when no saved preference exists. Toolbar changes are persisted. */
  initialView?: 'graph' | 'tree';
  initialFilters?: { activeOnly?: boolean; showComposables?: boolean };
  /** Initial graph scale, clamped to the supported range 0.25–2. */
  initialZoom?: number;
  tree?: {
    stickyScopes?: boolean;
    /** Whether branches begin expanded. Defaults to true. */
    initialExpanded?: boolean;
  };
  /** Show the node-details pane. Defaults to true. */
  showDetails?: boolean;
}
export type ChipPalette = Record<
  DevtoolsChipKind,
  { color: string; background: string }
>;
export function resolveChipColors(
  overrides: ReactLayoutDevtoolsConfig['chipColors']
): ChipPalette {
  const defaults = {
    ...colors,
    active: '#6ee7b7',
    inactive: '#94a3b8',
    unresolved: '#94a3b8',
    reference: '#a78bfa',
    required: '#fbbf24',
    optional: '#94a3b8',
    included: '#38bdf8',
    custom: '#c4b5fd',
    component: '#6ee7b7',
    config: '#f9a8d4',
  };
  return Object.fromEntries(
    Object.entries(defaults).map(([kind, fallback]) => {
      const override = overrides?.[kind as DevtoolsChipKind];
      const color =
        typeof override === 'string' ? override : override?.color ?? fallback;
      return [
        kind,
        {
          color,
          background:
            typeof override === 'object' && override.background !== undefined
              ? override.background
              : `color-mix(in srgb, ${color} 10%, transparent)`,
        },
      ];
    })
  ) as ChipPalette;
}
export function initialGraphZoom(value = 1): number {
  return Number.isFinite(value) ? Math.min(2, Math.max(0.25, value)) : 1;
}
