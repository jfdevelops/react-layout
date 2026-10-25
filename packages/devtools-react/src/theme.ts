import type { CSSProperties } from 'react';
import type { GraphNode } from '@jfdevelops/react-layout-devtools-core';
export const colors: Record<GraphNode['kind'], string> = {
  definition: '#94a3b8',
  resource: '#38bdf8',
  layout: '#a78bfa',
  state: '#fbbf24',
  composable: '#f472b6',
  lazy: '#94a3b8',
};
export const control: CSSProperties = {
  color: '#e2e8f0',
  background: '#182335',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '7px 10px',
};
