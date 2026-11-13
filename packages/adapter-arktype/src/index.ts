import { createAdapter } from '@jfdevelops/react-layout-adapters';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ReactElement, ReactNode } from 'react';
import { type } from 'arktype';

/** Opaque schema types keep ArkType internals out of consumer mapped generics. */
export interface ReactNodeSchema extends StandardSchemaV1<
  Exclude<ReactNode, undefined>,
  Exclude<ReactNode, undefined>
> {}

export interface ReactElementSchema extends StandardSchemaV1<
  ReactElement,
  ReactElement
> {}

export const { reactNode, reactElement } = createAdapter({
  node: (check) => type('unknown').narrow(check) as unknown as ReactNodeSchema,
  element: (check) =>
    type('unknown').narrow(check) as unknown as ReactElementSchema,
});
