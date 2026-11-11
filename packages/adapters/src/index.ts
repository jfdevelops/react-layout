import { isValidElement, version, type ReactElement, type ReactNode } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createReactNodeCheck } from './react-node';

type CreateAdapterOptions<
  TNode extends StandardSchemaV1<unknown, ReactNode>,
  TElement extends StandardSchemaV1<unknown, ReactElement>,
> = {
  node: (check: ReactCheck<Exclude<ReactNode, undefined>>) => TNode;
  element: (check: ReactCheck<ReactElement>) => TElement;
};

const allowsReactNode = createReactNodeCheck(isValidElement, version);

export type ReactCheck<Value> = (value: unknown) => value is Value;

function isReactNode(value: unknown): value is Exclude<ReactNode, undefined> {
  return value !== undefined && allowsReactNode(value);
}

function isReactElement(value: unknown): value is ReactElement {
  return isValidElement(value);
}

/** Wrap React predicates in your schema library's native schema constructors. */
export function createAdapter<
  TNode extends StandardSchemaV1<unknown, ReactNode>,
  TElement extends StandardSchemaV1<unknown, ReactElement>,
>(options: CreateAdapterOptions<TNode, TElement>) {
  const { node, element } = options;

  return {
    reactNode() {
      return node(isReactNode);
    },
    reactElement() {
      return element(isReactElement);
    },
  };
}
