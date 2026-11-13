import type { DevtoolsConfig } from '@jfdevelops/react-layout-devtools-core';

/** Backward-compatible React name for the settings shared by every adapter. */
export interface ReactLayoutDevtoolsConfig extends DevtoolsConfig {}

export {
  initialGraphZoom,
  resolveChipColors,
} from '@jfdevelops/react-layout-devtools-core';

export type {
  ChipPalette,
  DevtoolsChipKind,
  DevtoolsChipColor,
} from '@jfdevelops/react-layout-devtools-core';
