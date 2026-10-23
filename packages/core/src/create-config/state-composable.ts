import {
  createContext,
  createElement,
  useContext,
  type ComponentType,
  type JSX,
} from 'react';
import { LayoutConfigurationError } from '../errors';
import type { IncludedProps } from '../props';
import { capitalize } from '../utils/capitalize';

/** Props selected here are inherited from the containing state's render props. */
export type StateComposableOptions<
  Props extends object,
  Include extends IncludedProps<Props> = {},
> = {
  props?: {
    include?: Include & { [Key in Exclude<keyof Include, keyof Props>]: never };
  };
};

type StateComposableCallProps<Props extends object, Carried extends keyof Props> =
  Omit<Props, Carried> & Partial<Pick<Props, Carried>>;

/** Non-enumerable state helpers; class methods stay out of object-spread types. */
export declare class StateComposableHandle<Props extends object> {
  asComposable<const Include extends IncludedProps<Props> = {}>(
    options?: StateComposableOptions<Props, Include>,
  ): StateComposable<Props, keyof Include & keyof Props>;
}

/** A state component usable in a composables map, optionally inheriting props. */
export type StateComposable<
  Props extends object,
  Carried extends keyof Props = never,
> = {
  (props: StateComposableCallProps<Props, Carried>): JSX.Element;
  displayName: string;
  props: StateComposableCallProps<Props, Carried>;
  asComposable: AsStateComposable<Props>;
};

/** Converts a state into a composable; unselected required props remain required. */
export type AsStateComposable<Props extends object> = <
  const Include extends IncludedProps<Props> = {},
>(
  options?: StateComposableOptions<Props, Include>,
) => StateComposable<Props, keyof Include & keyof Props>;

/** @internal The definition is kept by identity so builder references need no registration. */
export type StateComposableSource = {
  input: unknown;
  name: string;
  /** Fallback state that must not recursively render this reference. */
  fallbackStateName?: string;
};

/** @internal Shared by all states in one created resource layout. */
export type RenderStateScope = {
  states: Record<string, StateComposable<Record<string, unknown>>>;
  resolve: (source: StateComposableSource) => ComponentType<Record<string, unknown>>;
};

/** @internal Each rendered state supplies its own resolved values for carry-over. */
export const StateComposableContext = createContext<{
  scope: RenderStateScope;
  props: Record<string, unknown>;
  definitions: Record<string, unknown>;
} | undefined>(undefined);

/** @internal Defers state resolution until render, allowing forward references. */
export function createStateComposable(
  source: StateComposableSource,
  options: StateComposableOptions<Record<string, unknown>, IncludedProps<Record<string, unknown>>> & {
    normalizeIncludedKeys?: boolean;
  } = {},
): StateComposable<Record<string, unknown>> {
  function StateReference(callProps: Record<string, unknown>) {
    const context = useContext(StateComposableContext);
    if (!context) {
      throw new LayoutConfigurationError(
        `Render state "${source.name}" must be used inside a resource layout`,
      );
    }
    const inherited = Object.fromEntries(
      Object.keys(options.props?.include ?? {}).map((key) => {
        const definition = context.definitions[key];
        return options.normalizeIncludedKeys && typeof definition === 'function' &&
          'type' in definition && definition.type === 'JSX.Element' ? capitalize(key) : key;
      }).flatMap((key) =>
        Object.prototype.hasOwnProperty.call(context.props, key) && context.props[key] !== undefined
          ? [[key, context.props[key]]]
          : [],
      ),
    );
    return createElement(context.scope.resolve(source), {
      ...inherited,
      ...callProps,
    });
  }
  return withStateComposable(Object.assign(StateReference, {
    displayName: `State.${source.name}`,
    props: undefined as unknown as Record<string, unknown>,
  }), source) as StateComposable<Record<string, unknown>>;
}

/** @internal Keeps helper methods out of spreadable state maps. */
export function withStateComposable<Value extends object>(
  value: Value,
  source: StateComposableSource,
): Value & { asComposable: AsStateComposable<Record<string, unknown>> } {
  if (Object.prototype.hasOwnProperty.call(value, 'asComposable')) {
    throw new LayoutConfigurationError(
      'Render state name "asComposable" is reserved',
    );
  }
  Object.defineProperty(value, 'asComposable', {
    enumerable: false,
    value: (options?: StateComposableOptions<Record<string, unknown>, IncludedProps<Record<string, unknown>>>) =>
      createStateComposable(source, options),
  });
  return value as Value & { asComposable: AsStateComposable<Record<string, unknown>> };
}

/** @internal References are descriptors, so reading them never constructs a layout. */
export function createStateReferences(states: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(states).map(([name, input]) => [
    name, createStateComposable({ input, name }),
  ]));
}
