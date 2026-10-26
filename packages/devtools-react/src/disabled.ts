import type { ReactLayoutDevtoolsProps } from './floating';
import type { ReactLayoutDevtoolsProviderProps } from './context';
import type { ReactLayoutDevtoolsContentProps } from './content';

export function ReactLayoutDevtools(_props: ReactLayoutDevtoolsProps) {
  return null;
}

export function ReactLayoutDevtoolsContent(
  _props: ReactLayoutDevtoolsContentProps
) {
  return null;
}

export function ReactLayoutDevtoolsProvider(
  _props: ReactLayoutDevtoolsProviderProps
) {
  return null;
}

export function ReactLayoutDevtoolsToolbar() {
  return null;
}

export function ReactLayoutDevtoolsExplorer() {
  return null;
}

export function ReactLayoutDevtoolsInspector() {
  return null;
}

export function ReactLayoutDevtoolsFooter() {
  return null;
}

export function ReactLayoutDevtoolsWorkspace() {
  return null;
}

export function useReactLayoutDevtools(): never {
  throw new Error(
    'Devtools state is unavailable in production. Import the /production entry to enable it.'
  );
}

export type * from './production';
