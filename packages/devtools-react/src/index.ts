import { ReactLayoutDevtools as EnabledDevtools } from './floating';
import {
  ReactLayoutDevtoolsContent as EnabledContent,
  ReactLayoutDevtoolsProvider as EnabledProvider,
  ReactLayoutDevtoolsToolbar as EnabledToolbar,
  ReactLayoutDevtoolsExplorer as EnabledExplorer,
  ReactLayoutDevtoolsInspector as EnabledInspector,
  ReactLayoutDevtoolsFooter as EnabledFooter,
  ReactLayoutDevtoolsWorkspace as EnabledWorkspace,
  useReactLayoutDevtools as useEnabledDevtools,
} from './content';
import * as disabled from './disabled';
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

export const ReactLayoutDevtoolsProvider =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsProvider
    : EnabledProvider;

export const ReactLayoutDevtoolsToolbar =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsToolbar
    : EnabledToolbar;

export const ReactLayoutDevtoolsExplorer =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsExplorer
    : EnabledExplorer;

export const ReactLayoutDevtoolsInspector =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsInspector
    : EnabledInspector;

export const ReactLayoutDevtoolsFooter =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsFooter
    : EnabledFooter;

export const ReactLayoutDevtoolsWorkspace =
  process.env.NODE_ENV === 'production'
    ? disabled.ReactLayoutDevtoolsWorkspace
    : EnabledWorkspace;

export const useReactLayoutDevtools =
  process.env.NODE_ENV === 'production'
    ? disabled.useReactLayoutDevtools
    : useEnabledDevtools;

export type { ReactLayoutDevtoolsProviderProps } from './content';

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
