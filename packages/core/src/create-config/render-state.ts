import type { JSX } from 'react';
import { withStateComposable, type StateComposable, type StateComposableHandle } from './state-composable';
import type { ResolveProps } from '@jfdevelops/react-layout-validator';
import type {
  ComposableComponents,
  CreateLayoutComposable,
} from '@jfdevelops/react-layout-composables';
import type { InPropsObject } from '../props';
import type {
  IncludedProps,
  InPropsDefinition,
  LayoutRenderProps,
  MergedLayoutInProps,
  ResolvedIncludedComponentProps,
} from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';

export const deferredRenderStateSymbol: unique symbol = Symbol(
  'deferredRenderState',
) as never;
export const lazyRenderStateSymbol: unique symbol = Symbol(
  'lazyRenderState',
) as never;
export const definedRenderStateSymbol: unique symbol = Symbol.for(
  '@jfdevelops/react-layout/render-state',
) as never;
export const definedResourceLayoutComponentSymbol: unique symbol = Symbol.for(
  '@jfdevelops/react-layout/resource-layout-component',
) as never;

/** Runtime-compatible render-state shape used when inspecting lazy modules. */
export type AnyRenderStateDefinition = {
  composables?: (create: CreateLayoutComposable<any>, states: any) => ComposableComponents;
  props?: {
    include?: Record<string, unknown>;
    custom?: InPropsObject;
  };
  render: (props: any, context: any) => JSX.Element;
  state?: string;
};

/** An inline state whose first render is scheduled through `React.lazy`. */
export type DeferredRenderState<Definition extends AnyRenderStateDefinition> = {
  readonly [deferredRenderStateSymbol]: Definition;
};

/** A state definition supplied by a separately imported module. */
export type LazyRenderState<Definition extends AnyRenderStateDefinition> = {
  readonly [lazyRenderStateSymbol]: () => Promise<Record<string, unknown>>;
  readonly definition?: Definition;
};

/**
 * State names accepted by `createRenderState`. Built-in states are suggested by
 * autocomplete while any other string still creates a custom compound state.
 */
export type RenderStateName =
  | 'default'
  | 'Loading'
  | 'Error'
  | 'NotFound'
  | (string & {});

/** Callback shorthand for a render state with no local configuration. */
export type RenderStateCallback = (props: any, context: any) => JSX.Element;

/**
 * Defines state-local composable components with a `create` helper narrowed to
 * the resources bound to the surrounding builder.
 */
export type RenderStateComposablesDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Composables extends ComposableComponents,
  States = {},
> = (
  create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
  states: States,
) => Composables;

/**
 * Defines reusable layout-level composables while preserving their inferred
 * names, props, and bound resource union.
 */
export type LayoutComposablesDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Composables extends ComposableComponents,
> = RenderStateComposablesDefinition<Resources, Composables>;

type BuilderRenderComposables<Composables extends ComposableComponents> = [
  keyof Composables,
] extends [never]
  ? undefined
  : Composables;

/** Values available as the second argument of a created state's `render`. */
export type RenderStateContext<
  Composables extends ComposableComponents,
> = {
  composables: BuilderRenderComposables<Composables>;
  retry?: () => void;
};

/**
 * Resolves one state's custom props and explicitly included option/composable
 * props to the values received by its render callback.
 */
export type RenderStateProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends IncludedProps<
    MergedLayoutInProps<Resources, Options, Composables>
  >,
  CustomProps extends InPropsObject,
> = LayoutRenderProps<
  Resources,
  Options,
  Composables,
  IncludeProps,
  CustomProps
>;

type TypedRenderStateDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  State extends string,
  CustomProps extends InPropsObject,
  SharedComposables extends ComposableComponents,
  StateComposables extends ComposableComponents,
  IncludeProps extends IncludedProps<
    MergedLayoutInProps<
      Resources,
      Options,
      SharedComposables & StateComposables
    >
  >,
> = {
  composables?: RenderStateComposablesDefinition<Resources, StateComposables>;
  props?: {
    include?: IncludeProps;
    custom?: CustomProps;
  };
  render: (
    props: RenderStateProps<
      Resources,
      Options,
      SharedComposables & StateComposables,
      IncludeProps,
      CustomProps
    >,
    context: RenderStateContext<SharedComposables & StateComposables>,
  ) => JSX.Element;
  state: State;
};

/**
 * Callback shorthand for a created state, typed with the bound resources,
 * options, and shared composables.
 */
export type TypedRenderStateCallback<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  SharedComposables extends ComposableComponents,
> = (
  props: RenderStateProps<Resources, Options, SharedComposables, {}, {}>,
  context: RenderStateContext<SharedComposables>,
) => JSX.Element;

type NormalizeRenderStateDefinition<Input> =
  Input extends DeferredRenderState<infer Definition>
    ? Definition
    : Input extends RenderStateCallback
      ? { render: Input; state: 'default' }
      : Input extends AnyRenderStateDefinition
        ? Input
        : never;

type StateName<Definition> = Definition extends DeferredRenderState<
  infer DeferredDefinition
>
  ? StateName<DeferredDefinition>
  : Definition extends { state?: infer State extends string }
    ? State
    : 'default';

/**
 * A spreadable state entry keyed by its literal state name. Spreading this into
 * `layout.render` is what creates compound members such as `Users.Loading`.
 */
export type RenderStateFragment<Definition, CallProps extends object = ResolveProps<StateCustomProps<Definition>>> = {
  [State in StateName<NormalizeRenderStateDefinition<Definition>>]: Definition;
} & {
  readonly [definedRenderStateSymbol]: NormalizeRenderStateDefinition<Definition>;
} & StateComposableHandle<CallProps>;

type StateCustomProps<Input> = NormalizeStateInput<Input> extends {
  props?: { custom?: infer Props extends InPropsObject };
} ? Props : {};

type StateIncludes<Input> = NormalizeStateInput<Input> extends {
  props?: { include?: infer Includes };
} ? Includes : {};

type NormalizeStateInput<Input> = Input extends DeferredRenderState<infer Definition>
  ? Definition
  : Input extends LazyRenderState<infer Definition> ? Definition : Input;

type StateLocalComposables<Input> = NormalizeStateInput<Input> extends {
  composables?: (...args: any[]) => infer Components extends ComposableComponents;
} ? Components : {};

/** Call-site props of a referenced state; creation-time options stay bound. */
export type RenderStateCallProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = ResolveProps<StateCustomProps<Input>> & ResolvedIncludedComponentProps<
  MergedLayoutInProps<Resources, Options, Composables & StateLocalComposables<Input>>,
  StateIncludes<Input> extends IncludedProps<MergedLayoutInProps<Resources, Options, Composables & StateLocalComposables<Input>>>
    ? StateIncludes<Input> : {}
>;

/** Typed references to all the states declared in an inline render map. */
export type RenderStateReferences<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  States,
> = {
  readonly [State in keyof States & string]: StateComposable<
    RenderStateCallProps<Resources, Options, Composables, States[State]>
  >;
};

type BoundRenderStateFragment<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Definition,
> = RenderStateFragment<Definition, RenderStateCallProps<
  Resources, Options, Composables, Definition
>>;

type DefinedRenderStateFromModule<Module> = Extract<
  Module[keyof Module],
  { readonly [definedRenderStateSymbol]: AnyRenderStateDefinition }
>[typeof definedRenderStateSymbol];

/** Wraps a state definition in the deferred marker when `Deferred` is `true`. */
type RenderStateEntry<Definition, Deferred extends boolean> = Deferred extends true
  ? DeferredRenderState<NormalizeRenderStateDefinition<Definition>>
  : Definition;

/**
 * Overloads shared by `createRenderState` and `createRenderState.defer`. Each
 * accepts a full definition, a definition without `state`, or a render
 * callback; `Deferred` decides whether the returned entry is deferred.
 */
export interface RenderStateOverloads<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  SharedComposables extends ComposableComponents,
  Deferred extends boolean,
> {
  <
    const State extends RenderStateName,
    const CustomProps extends InPropsObject = {},
    const StateComposables extends ComposableComponents = {},
    const IncludeProps extends IncludedProps<
      MergedLayoutInProps<
        Resources,
        Options,
        SharedComposables & StateComposables
      >
    > = {},
  >(
    definition: TypedRenderStateDefinition<
      Resources,
      Options,
      State,
      CustomProps,
      SharedComposables,
      StateComposables,
      IncludeProps
    >,
  ): BoundRenderStateFragment<Resources, Options, SharedComposables,
    RenderStateEntry<
      TypedRenderStateDefinition<
        Resources,
        Options,
        State,
        CustomProps,
        SharedComposables,
        StateComposables,
        IncludeProps
      >,
      Deferred
    >
  >;
  <
    const CustomProps extends InPropsObject = {},
    const StateComposables extends ComposableComponents = {},
    const IncludeProps extends IncludedProps<
      MergedLayoutInProps<
        Resources,
        Options,
        SharedComposables & StateComposables
      >
    > = {},
  >(
    definition: Omit<
      TypedRenderStateDefinition<
        Resources,
        Options,
        'default',
        CustomProps,
        SharedComposables,
        StateComposables,
        IncludeProps
      >,
      'state'
    >,
  ): BoundRenderStateFragment<Resources, Options, SharedComposables,
    RenderStateEntry<
      TypedRenderStateDefinition<
        Resources,
        Options,
        'default',
        CustomProps,
        SharedComposables,
        StateComposables,
        IncludeProps
      >,
      Deferred
    >
  >;
  (
    render: TypedRenderStateCallback<Resources, Options, SharedComposables>,
  ): BoundRenderStateFragment<Resources, Options, SharedComposables,
    RenderStateEntry<
      TypedRenderStateCallback<Resources, Options, SharedComposables>,
      Deferred
    >
  >;
}

/**
 * Creates independently typed render-state fragments.
 *
 * - Calling it directly creates an eager state.
 * - `.defer(...)` schedules an inline definition through `React.lazy`, but
 *   does not create a separate JavaScript chunk.
 * - `.lazy(() => import(...))` imports a complete named state definition as a
 *   separate chunk.
 */
export interface CreateRenderState<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  SharedComposables extends ComposableComponents = {},
> extends RenderStateOverloads<Resources, Options, SharedComposables, false> {
  defer: RenderStateOverloads<Resources, Options, SharedComposables, true>;
  lazy<Module extends Record<string, unknown>>(
    load: () => Promise<Module>,
  ): LazyRenderState<DefinedRenderStateFromModule<Module>> & StateComposableHandle<
    RenderStateCallProps<Resources, Options, SharedComposables, DefinedRenderStateFromModule<Module>>
  >;
}

function normalizeDefinition(
  input: AnyRenderStateDefinition | RenderStateCallback,
): AnyRenderStateDefinition {
  return typeof input === 'function'
    ? { render: input, state: 'default' }
    : input;
}

function toFragment<Definition extends AnyRenderStateDefinition>(
  definition: Definition,
) {
  const fragment = {
    [definition.state ?? 'default']: definition,
  } as RenderStateFragment<Definition>;

  Object.defineProperty(fragment, definedRenderStateSymbol, {
    enumerable: false,
    value: definition,
  });

  return withStateComposable(fragment, { input: definition, name: definition.state ?? 'default' });
}

/** Inputs used internally to bind resource and option types to a state builder. */
export type CreateRenderStateBuilderArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  SharedComposables extends ComposableComponents = {},
> = {
  /** Shared composables whose components and preset props every state can use. */
  composables?: LayoutComposablesDefinition<Resources, SharedComposables>;
  /** Option props that individual states can expose through `props.include`. */
  options: Options;
  /** Resources used to constrain composable names and resource-specific props. */
  resources: Resources;
};

/** The state factory produced for a particular resource and option definition. */
export type CreateRenderStateBuilderResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  SharedComposables extends ComposableComponents = {},
> = CreateRenderState<Resources, Options, SharedComposables>;

/**
 * Creates a state factory whose `props.include` keys are constrained by the
 * supplied resources and options.
 */
export function createRenderStateBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  SharedComposables extends ComposableComponents = {},
>(
  _arguments: CreateRenderStateBuilderArguments<
    Resources,
    Options,
    SharedComposables
  >,
): CreateRenderStateBuilderResult<Resources, Options, SharedComposables> {
  function createRenderState(
    input: AnyRenderStateDefinition | RenderStateCallback,
  ) {
    return toFragment(normalizeDefinition(input));
  }

  createRenderState.defer = (
    input: AnyRenderStateDefinition | RenderStateCallback,
  ) => {
    const definition = normalizeDefinition(input);

    const deferred = { [deferredRenderStateSymbol]: definition };
    return withStateComposable({ [definition.state ?? 'default']: deferred }, {
      input: deferred, name: definition.state ?? 'default',
    });
  };
  createRenderState.lazy = (
    load: () => Promise<Record<string, unknown>>,
  ) => {
    const lazyState = { [lazyRenderStateSymbol]: load };
    return withStateComposable(lazyState, { input: lazyState, name: 'lazy' });
  };

  return createRenderState as unknown as CreateRenderStateBuilderResult<
    Resources,
    Options,
    SharedComposables
  >;
}

/** Type guard for states created with `createRenderState.defer(...)`. */
export function isDeferredRenderState(
  value: unknown,
): value is DeferredRenderState<AnyRenderStateDefinition> {
  return (
    typeof value === 'object' &&
    value !== null &&
    deferredRenderStateSymbol in value
  );
}

/** Type guard for states created with `createRenderState.lazy(...)`. */
export function isLazyRenderState(
  value: unknown,
): value is LazyRenderState<AnyRenderStateDefinition> {
  return (
    typeof value === 'object' && value !== null && lazyRenderStateSymbol in value
  );
}

/**
 * Selects the single state definition exported by a lazy module. Throws when
 * the module exports none or more than one, avoiding ambiguous selection.
 */
export function findDefinedRenderState(
  module: Record<string, unknown>,
): AnyRenderStateDefinition {
  const definitions = Object.values(module).filter(
    (value) =>
      typeof value === 'object' && value !== null && definedRenderStateSymbol in value,
  ) as Array<Record<typeof definedRenderStateSymbol, AnyRenderStateDefinition>>;

  if (definitions.length !== 1) {
    throw new Error(
      `A lazy render-state module must export exactly one defined render state; received ${definitions.length}.`,
    );
  }

  return definitions[0][definedRenderStateSymbol];
}

/** Identity helper that contextually types a reusable composables callback. */
export type DefineLayoutComposables<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <const Composables extends ComposableComponents>(
  definition: LayoutComposablesDefinition<Resources, Composables>,
) => LayoutComposablesDefinition<Resources, Composables>;

/** Public cross-file building blocks returned by a defined layout builder. */
export type CreateLayoutBuildingBlocks<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = {
  composables: DefineLayoutComposables<Resources>;
  createRenderState: CreateRenderState<Resources, Options>;
};

/** Resource and option bindings used to create layout building blocks. */
export type CreateLayoutBuildingBlocksArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = CreateRenderStateBuilderArguments<Resources, Options>;

/** Layout helpers produced for the supplied resource and option bindings. */
export type CreateLayoutBuildingBlocksResult<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = CreateLayoutBuildingBlocks<Resources, Options>;

/**
 * Creates the reusable `composables` and `createRenderState` helpers without
 * introducing an identity wrapper around the layout object itself.
 */
export function createLayoutBuildingBlocks<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
>(
  arguments_: CreateLayoutBuildingBlocksArguments<Resources, Options>,
): CreateLayoutBuildingBlocksResult<Resources, Options> {
  function composables<const Composables extends ComposableComponents>(
    definition: LayoutComposablesDefinition<Resources, Composables>,
  ): LayoutComposablesDefinition<Resources, Composables> {
    return definition;
  }

  return {
    composables,
    createRenderState: createRenderStateBuilder(arguments_),
  };
}

/** Preserves a bound resource tuple for consumers that need to re-export it. */
export type BoundResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = Resources;
