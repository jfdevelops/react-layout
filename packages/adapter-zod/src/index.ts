import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => z.custom<Exclude<ReactNode, undefined>>(check, 'Expected a React node'),
  element: (check) => z.custom<ReactElement>(check, 'Expected a React element'),
});
