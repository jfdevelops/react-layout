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

/**
 * Names a schema's type for tools that display it, such as the devtools.
 * Predicate-based schemas otherwise describe themselves only as `unknown`.
 */
export const schemaTypeNameSymbol: unique symbol = Symbol.for(
  '@jfdevelops/react-layout/schema-type-name',
) as never;

function nameSchemaType<Schema extends object>(schema: Schema, name: string) {
  try {
    Object.defineProperty(schema, schemaTypeNameSymbol, {
      configurable: true,
      enumerable: false,
      value: name,
    });
  } catch {
    // A frozen schema keeps working; it is simply displayed as `unknown`.
  }

  return schema;
}

/** Wrap React predicates in your schema library's native schema constructors. */
export function createAdapter<
  TNode extends StandardSchemaV1<unknown, ReactNode>,
  TElement extends StandardSchemaV1<unknown, ReactElement>,
>(options: CreateAdapterOptions<TNode, TElement>) {
  const { node, element } = options;

  return {
    reactNode() {
      return nameSchemaType(node(isReactNode), 'ReactNode');
    },
    reactElement() {
      return nameSchemaType(element(isReactElement), 'ReactElement');
    },
  };
}
