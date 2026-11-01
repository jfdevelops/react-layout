import { createContext } from 'react';

/** Active state for descendants, including scoped components. */
export const RenderStateNameContext = createContext<string>('default');

/** Only state references carry the caller's name into another state's layout. */
export const ReferencedRenderStateContext = createContext<string | undefined>(
  undefined,
);

/** Automatic fallbacks start their own state instead of inheriting a reference. */
export function RenderStateFallback({
  state,
  children,
}: {
  state: 'Loading' | 'Error';
  children: import('react').ReactNode;
}) {
  return (
    <ReferencedRenderStateContext.Provider value={undefined}>
      <RenderStateNameContext.Provider value={state}>
        {children}
      </RenderStateNameContext.Provider>
    </ReferencedRenderStateContext.Provider>
  );
}
