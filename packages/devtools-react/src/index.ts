import { ReactLayoutDevtools as EnabledDevtools } from './floating';
import { ReactLayoutDevtoolsContent as EnabledContent } from './content';
import type { ReactLayoutDevtoolsProps } from './floating';
import type { ReactLayoutDevtoolsContentProps } from './content';

// Bundlers replace this expression, removing the unused inspector imports.
declare const process: { env: { NODE_ENV?: string } };

export const ReactLayoutDevtools =
  process.env.NODE_ENV === 'production'
    ? (_props: ReactLayoutDevtoolsProps) => null
    : EnabledDevtools;

export const ReactLayoutDevtoolsContent =
  process.env.NODE_ENV === 'production'
    ? (_props: ReactLayoutDevtoolsContentProps) => null
    : EnabledContent;

export type { ReactLayoutDevtoolsProps, ReactLayoutDevtoolsContentProps };
export type {
  DevtoolsConfig,
  DevtoolsPreferences,
  DevtoolsSessionState,
  GraphNode,
  GraphEdge,
  GraphSnapshot,
  InspectionSource,
} from '@jfdevelops/react-layout-devtools-core';
export type {
  ReactLayoutDevtoolsConfig,
  DevtoolsChipColor,
  DevtoolsChipKind,
} from './config';
