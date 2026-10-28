import type { ReactNode } from 'react';
import type { ChipPalette } from './config';

// Paths from Lucide (https://lucide.dev), ISC licensed.
const paths = {
  default: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  Loading: (
    <>
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </>
  ),
  Error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  NotFound: (
    <>
      <path d="m13.5 8.5-5 5" />
      <path d="m8.5 8.5 5 5" />
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  custom: (
    <>
      <path d="M5 3a2 2 0 0 0-2 2" />
      <path d="M19 3a2 2 0 0 1 2 2" />
      <path d="M21 19a2 2 0 0 1-2 2" />
      <path d="M5 21a2 2 0 0 1-2-2" />
      <path d="M9 3h1" />
      <path d="M9 21h1" />
      <path d="M14 3h1" />
      <path d="M14 21h1" />
      <path d="M3 9v1" />
      <path d="M21 9v1" />
      <path d="M3 14v1" />
      <path d="M21 14v1" />
    </>
  ),
} satisfies Record<string, ReactNode>;

type StateIconKind = keyof typeof paths;

/** Built-in render states get their own icon; any other state is `custom`. */
export function stateIconKind(state: string): StateIconKind {
  return state === 'default' ||
    state === 'Loading' ||
    state === 'Error' ||
    state === 'NotFound'
    ? state
    : 'custom';
}

function iconColor(kind: StateIconKind, palette: ChipPalette) {
  if (kind === 'Loading') return palette.loading.color;

  if (kind === 'Error') return palette.error.color;

  if (kind === 'NotFound') return '#fbbf24';

  return palette.inactive.color;
}

/** Decorative icon for a render state; the adjacent text stays the accessible name. */
export function StateIcon({
  state,
  palette,
  size = 12,
  spinning = false,
}: {
  /** The state's label, e.g. `Loading`. */
  state: string;
  palette: ChipPalette;
  size?: 12 | 14;
  /** Spin the Loading icon, e.g. while that state is active or forced. */
  spinning?: boolean;
}) {
  const kind = stateIconKind(state);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-state-icon={kind}
      data-spinning={kind === 'Loading' && spinning ? true : undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor(kind, palette)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths[kind]}
    </svg>
  );
}
