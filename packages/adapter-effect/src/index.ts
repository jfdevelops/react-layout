import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { Schema } from 'effect';
import type { ReactElement, ReactNode } from 'react';

export const { reactNode, reactElement } = createAdapter({
  node: (check) =>
    Schema.toStandardSchemaV1(
      Schema.declare<Exclude<ReactNode, undefined>>(check, {
        expected: 'a React node',
      }),
    ),
  element: (check) =>
    Schema.toStandardSchemaV1(
      Schema.declare<ReactElement>(check, {
        expected: 'a React element',
      }),
    ),
});
