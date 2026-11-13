import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { Schema } from 'effect';

export const { reactNode, reactElement } = createAdapter({
  node: (check) =>
    Schema.toStandardSchemaV1(
      Schema.declare(check, {
        expected: 'a React node',
      }),
    ),
  element: (check) =>
    Schema.toStandardSchemaV1(
      Schema.declare(check, {
        expected: 'a React element',
      }),
    ),
});
