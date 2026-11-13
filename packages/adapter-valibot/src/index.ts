import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { custom } from 'valibot';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) =>
    custom<Exclude<ReactNode, undefined>>(check, 'Expected a React node'),
  element: (check) => custom<ReactElement>(check, 'Expected a React element'),
});
