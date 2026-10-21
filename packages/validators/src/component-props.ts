import type { BuiltPropShape } from './types';

/** Metadata key used by library-created components to retain prop validators. */
export const componentPropDefinitionsSymbol: unique symbol = Symbol.for(
  '@jfdevelops/react-layout/component-prop-definitions',
) as never;

/**
 * A component created by the layout library with its runtime prop definitions
 * attached. Ordinary React components do not satisfy this contract.
 */
export type ComponentWithPropDefinitions<
  Definitions extends BuiltPropShape = BuiltPropShape,
> = {
  readonly [componentPropDefinitionsSymbol]: Definitions;
};

/**
 * Attaches non-enumerable prop-definition metadata without changing the
 * component's callable surface.
 */
export function attachComponentPropDefinitions<
  Component extends object,
  const Definitions extends BuiltPropShape,
>(component: Component, definitions: Definitions) {
  Object.defineProperty(component, componentPropDefinitionsSymbol, {
    configurable: false,
    enumerable: false,
    value: definitions,
    writable: false,
  });

  return component as Component & ComponentWithPropDefinitions<Definitions>;
}

/**
 * Creates `pick` and `omit` helpers over a library-created component's retained
 * prop definitions. Required/optional behavior and runtime validators are
 * preserved, so the result can be reused directly as another state's `custom`
 * props.
 */
export function createPropsFromComponent<
  const Definitions extends BuiltPropShape,
>(component: ComponentWithPropDefinitions<Definitions>) {
  const definitions = component[componentPropDefinitionsSymbol];

  return {
    omit<const Keys extends ReadonlyArray<keyof Definitions & string>>(
      ...keys: Keys
    ) {
      const omittedKeys = new Set<string>(keys);

      return Object.fromEntries(
        Object.entries(definitions).filter(([key]) => !omittedKeys.has(key)),
      ) as Omit<Definitions, Keys[number]>;
    },
    pick<const Keys extends ReadonlyArray<keyof Definitions & string>>(
      ...keys: Keys
    ) {
      return Object.fromEntries(
        keys.flatMap((key) =>
          key in definitions ? [[key, definitions[key]]] : [],
        ),
      ) as Pick<Definitions, Keys[number]>;
    },
  };
}
