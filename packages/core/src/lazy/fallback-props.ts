import { createContext } from 'react';

/** Scoped fallbacks receive current caller options without rebuilding their layout. */
export const LazyFallbackPropsContext = createContext<
  { owner?: string; props: Record<string, unknown> } | undefined
>(undefined);
