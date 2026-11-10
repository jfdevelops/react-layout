import { createAdapter } from '@jfdevelops/react-layout-adapters';
import { type } from 'arktype';

export const { reactNode, reactElement } = createAdapter({
  node: (check) => type('unknown').narrow(check),
  element: (check) => type('unknown').narrow(check),
});
