import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<ReactNode>(check, 'Expected a React node').optional(),
  element: (check) => z.custom<ReactElement>(check, 'Expected a React element'),
});
