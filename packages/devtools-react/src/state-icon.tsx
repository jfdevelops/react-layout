import {
  CheckIcon,
  LoadingIcon,
  ErrorIcon,
  NotFoundIcon,
  CustomStateIcon,
} from './icons';
import type { ChipPalette } from './config';

const icons = {
  default: CheckIcon,
  Loading: LoadingIcon,
  Error: ErrorIcon,
  NotFound: NotFoundIcon,
  custom: CustomStateIcon,
};

type StateIconKind = keyof typeof icons;

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
  const StateGlyph = icons[kind];

  return (
    <StateGlyph
      data-state-icon={kind}
      data-spinning={kind === 'Loading' && spinning ? true : undefined}
      size={size}
      style={{ color: iconColor(kind, palette) }}
    />
  );
}
