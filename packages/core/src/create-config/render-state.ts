import type { JSX } from 'react';
import { collectComposablePresetEntries, composablePresetMetaKey, type MergePresetProps, type ComposablePresetMeta } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from '../errors';
import { createStateComposable, withStateComposable, type StateComposable, type StateComposableHandle } from './state-composable';
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
  ResolvedIncludedProps,
} from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';
import type { LayoutRenderResourcesAccessor } from './define-layout';

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
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
> = {
  resources: LayoutRenderResourcesAccessor<Resources>;
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
    context: RenderStateContext<SharedComposables & StateComposables, Resources>,
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
  context: RenderStateContext<SharedComposables, Resources>,
) => JSX.Element;

type NormalizeRenderStateDefinition<Input> =
  Input extends LazyRenderState<infer Definition>
    ? Definition
    : Input extends DeferredRenderState<infer Definition>
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

/**
 * A composables callback cannot infer its own return value into its arguments.
 * Preserve the declared call-site contract for props supplied by local presets,
 * even when their value types are not yet available in the callback context.
 */
type UnresolvedStateComponentProps<Props, Includes> = {
  [Key in Exclude<keyof Includes, keyof Props> as Includes[Key] extends {
    visibility: 'required'; passthrough: 'component';
  } ? Key : never]: unknown;
} & {
  [Key in Exclude<keyof Includes, keyof Props> as Includes[Key] extends
    | 'optional'
    | { visibility: 'optional'; passthrough: 'component' }
    ? Key : never]?: unknown;
};

type StateComponentProps<Props extends InPropsObject, Includes> =
  ResolvedIncludedComponentProps<Props,
    Pick<Includes, Extract<keyof Includes, keyof Props>> extends infer Known extends IncludedProps<Props>
      ? Known : {}
  > & UnresolvedStateComponentProps<Props, Includes>;

/** Call-site props of a referenced state; creation-time options stay bound. */
export type RenderStateCallProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = ResolveProps<StateCustomProps<Input>> & StateComponentProps<
  MergedLayoutInProps<Resources, Options, Composables & StateLocalComposables<Input>>,
  StateIncludes<Input>
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

type RenderStateReference = (
  | { readonly [definedRenderStateSymbol]: AnyRenderStateDefinition }
  | LazyRenderState<AnyRenderStateDefinition>
) & StateComposableHandle<any>;

type ReferenceDefinition<Ref extends RenderStateReference> =
  Ref extends LazyRenderState<infer Definition> ? Definition
    : Ref extends { readonly [definedRenderStateSymbol]: infer Definition extends AnyRenderStateDefinition }
      ? Definition : never;

type FromStateEntry<Ref extends RenderStateReference, Definition extends AnyRenderStateDefinition> =
  Ref extends LazyRenderState<AnyRenderStateDefinition> ? LazyRenderState<Definition>
    : Extract<Ref[Exclude<keyof Ref, 'asComposable' | typeof definedRenderStateSymbol>], LazyRenderState<AnyRenderStateDefinition>> extends never
      ? Definition : LazyRenderState<Definition>;
type ReferenceSchemas<Ref extends RenderStateReference> =
  StateCustomProps<ReferenceDefinition<Ref>> & MergePresetProps<StateLocalComposables<ReferenceDefinition<Ref>>>;

type DefaultReferenceIncludes<Ref extends RenderStateReference, CustomProps> =
  Omit<StateIncludes<ReferenceDefinition<Ref>>, keyof CustomProps | keyof StateCustomProps<ReferenceDefinition<Ref>>> & {
    [Key in Exclude<keyof StateCustomProps<ReferenceDefinition<Ref>>, keyof CustomProps>]: {
      visibility: StateCustomProps<ReferenceDefinition<Ref>>[Key] extends { visibility: infer Visibility }
        ? Visibility : 'required';
      passthrough: 'component';
    };
  };

type ReferenceIncludes<Ref extends RenderStateReference, CustomProps, Include> =
  Include extends object ? Include : DefaultReferenceIncludes<Ref, CustomProps>;

type FromStateInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
  Ref extends RenderStateReference,
  Local extends ComposableComponents,
> = (MergedLayoutInProps<Resources, Options, Shared & StateLocalComposables<ReferenceDefinition<Ref>> & Local> &
  StateCustomProps<ReferenceDefinition<Ref>>) extends infer Props extends InPropsObject ? Props : {};

type SelectedReferenceSchemas<Ref extends RenderStateReference, Include> =
  Pick<ReferenceSchemas<Ref>, Extract<keyof Include, keyof ReferenceSchemas<Ref>>> extends infer Selected extends InPropsObject
    ? Selected : {};

type ReferenceCarriedProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
  Ref extends RenderStateReference,
  Include,
> = Pick<FromStateInProps<Resources, Options, Shared, Ref, {}>,
  Extract<keyof Include, keyof FromStateInProps<Resources, Options, Shared, Ref, {}>>
> extends infer Selected extends InPropsObject ? ResolveProps<Selected> : {};

type ReferenceRenderProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
  Ref extends RenderStateReference,
> = RenderStateProps<Resources, Options, Shared & StateLocalComposables<ReferenceDefinition<Ref>>,
  StateIncludes<ReferenceDefinition<Ref>> extends infer Include extends IncludedProps<MergedLayoutInProps<Resources, Options, Shared & StateLocalComposables<ReferenceDefinition<Ref>>>> ? Include : {},
  StateCustomProps<ReferenceDefinition<Ref>>>;

type FromStateComposables<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
  Ref extends RenderStateReference,
  Local extends ComposableComponents,
  Include,
> = Local & {
  Ref: StateComposable<
    ReferenceRenderProps<Resources, Options, Shared, Ref>,
    Extract<keyof ReferenceCarriedProps<Resources, Options, Shared, Ref, Include>, keyof ReferenceRenderProps<Resources, Options, Shared, Ref>>
  > & { [composablePresetMetaKey]: ComposablePresetMeta<SelectedReferenceSchemas<Ref, Include>> };
};

type FromStateDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
  Ref extends RenderStateReference,
  State extends string,
  CustomProps extends InPropsObject,
  Local extends ComposableComponents,
  Include,
> = {
  state: State;
  props?: { custom?: CustomProps; include?: ReferenceIncludes<Ref, CustomProps, Include> };
  composables: RenderStateComposablesDefinition<Resources,
    FromStateComposables<Resources, Options, Shared, Ref, Local, ReferenceIncludes<Ref, CustomProps, Include>>>;
  render: (
    props: ResolveProps<CustomProps> & ResolvedIncludedProps<FromStateInProps<Resources, Options, Shared, Ref, Local>,
      ReferenceIncludes<Ref, CustomProps, Include> extends infer Selected extends IncludedProps<FromStateInProps<Resources, Options, Shared, Ref, Local>> ? Selected : {}>,
    context: RenderStateContext<Shared & FromStateComposables<Resources, Options, Shared, Ref, Local, ReferenceIncludes<Ref, CustomProps, Include>>, Resources>,
  ) => JSX.Element;
};

/** Creates a state with inherited props and a composable reference to its source. */
export type CreateRenderStateFromState<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Shared extends ComposableComponents,
> = <
  const Ref extends RenderStateReference,
  const State extends RenderStateName = 'default',
  const CustomProps extends InPropsObject = {},
  const Local extends ComposableComponents = {},
  const Include extends IncludedProps<FromStateInProps<Resources, Options, Shared, Ref, Local>> | undefined = undefined,
>(definition: {
  ref: Ref;
  /** Defer Ref rendering through React.lazy. Defaults to false. */
  lazy?: boolean;
  state?: State;
  props?: {
    custom?: CustomProps;
    include?: Include & Record<Exclude<keyof Include, keyof FromStateInProps<Resources, Options, Shared, Ref, Local>>, never>;
  };
  composables?: (create: CreateLayoutComposable<LayoutResourceKey<Resources>>, states: {}) => Local & { Ref?: never };
  render: FromStateDefinition<Resources, Options, Shared, Ref, State, CustomProps, Local, Include>['render'];
}) => BoundRenderStateFragment<Resources, Options, Shared,
  FromStateEntry<Ref, FromStateDefinition<Resources, Options, Shared, Ref, State, CustomProps, Local, Include>>>;

/**
 * Creates independently typed render-state fragments.
 *
 * - Calling it directly creates an eager state.
 * - `.defer(...)` schedules an inline definition through `React.lazy`, but
 *   does not create a separate JavaScript chunk.
 * - `.lazy(() => import(...))` imports a complete named state definition as a
 *   separate chunk.
 * - `.fromState({ ref, ... })` inherits a state's props and exposes it as `Ref`.
 */
export interface CreateRenderState<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  SharedComposables extends ComposableComponents = {},
> extends RenderStateOverloads<Resources, Options, SharedComposables, false> {
  fromState: CreateRenderStateFromState<Resources, Options, SharedComposables>;
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

  createRenderState.fromState = (input: {
    ref: RenderStateReference;
    lazy?: boolean;
    state?: string;
    props?: AnyRenderStateDefinition['props'];
    composables?: AnyRenderStateDefinition['composables'];
    render: AnyRenderStateDefinition['render'];
  }): object => {
    const entry = isLazyRenderState(input.ref) ? input.ref : Object.values(input.ref)[0];
    if (isLazyRenderState(entry)) {
      const lazyState = {
        [lazyRenderStateSymbol]: async () => {
          const source = await findDefinedRenderState(await entry[lazyRenderStateSymbol]());
          return { Derived: createRenderState.fromState({ ...input, ref: toFragment(source) }) };
        },
      };
      const name = input.state ?? 'default';
      const fragment = { [name]: lazyState };
      Object.defineProperty(fragment, definedRenderStateSymbol, { value: lazyState });
      return withStateComposable(fragment, { input: lazyState, name });
    }
    const source = isDeferredRenderState(entry)
      ? entry[deferredRenderStateSymbol]
      : definedRenderStateSymbol in input.ref ? input.ref[definedRenderStateSymbol] : undefined;
    if (!source || typeof source.render !== 'function') {
      throw new LayoutConfigurationError('fromState requires a created render state');
    }
    const custom = input.props?.custom ?? {};
    const includes = input.props?.include ?? Object.fromEntries(
      Object.entries({
        ...source.props?.include,
        ...Object.fromEntries(Object.entries(source.props?.custom ?? {}).map(([key, prop]) => [
          key, { visibility: prop.visibility, passthrough: 'component' },
        ])),
      }).filter(([key]) => !(key in custom)),
    );
    return toFragment({
      state: input.state ?? 'default',
      props: { custom, include: includes },
      composables: (create, states) => {
        const inherited = source.composables?.(create, states) ?? {};
        const local = input.composables?.(create, states) ?? {};
        if (Object.prototype.hasOwnProperty.call(local, 'Ref')) {
          throw new LayoutConfigurationError('Composable name "Ref" is reserved by fromState');
        }
        const schemas = Object.assign({},
          ...collectComposablePresetEntries(inherited).map(({ props }) => props),
          source.props?.custom,
        ) as InPropsObject;
        const selected = Object.fromEntries(Object.entries(schemas).filter(([key]) => key in includes));
        const referenceSource = {
          ...source,
          props: {
            ...source.props,
            include: Object.fromEntries(Object.entries(source.props?.include ?? {}).map(([key, behavior]) => [
              key, {
                visibility: behavior === 'optional' || (typeof behavior === 'object' && behavior !== null && 'visibility' in behavior && behavior.visibility === 'optional')
                  ? 'optional' : 'required',
                passthrough: 'component',
              },
            ])),
          },
        };
        const Ref = createStateComposable({
          input: input.lazy || isDeferredRenderState(entry) ? { [deferredRenderStateSymbol]: referenceSource } : referenceSource,
          name: source.state ?? 'default',
          fallbackStateName: input.state,
        }, {
          props: { include: Object.fromEntries(Object.keys(includes).map((key) => [key, true as const])) },
          normalizeIncludedKeys: true,
        });
        Object.defineProperty(Ref, composablePresetMetaKey, {
          value: { key: 'Ref', props: selected },
        });
        return { ...local, Ref };
      },
      render: input.render,
    });
  };

  createRenderState.defer = (
    input: AnyRenderStateDefinition | RenderStateCallback,
  ) => {
    const definition = normalizeDefinition(input);

    const deferred = { [deferredRenderStateSymbol]: definition };
    const fragment = { [definition.state ?? 'default']: deferred };
    Object.defineProperty(fragment, definedRenderStateSymbol, { value: definition });
    return withStateComposable(fragment, {
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
 * Resolves the single state exported by a lazy module, including derived lazy
 * states. Throws when a module exports none or more than one.
 */
export async function findDefinedRenderState(
  module: Record<string, unknown>,
): Promise<AnyRenderStateDefinition> {
  const definitions = Object.values(module).filter(
    (value) =>
      typeof value === 'object' && value !== null && definedRenderStateSymbol in value,
  ) as Array<Record<typeof definedRenderStateSymbol, AnyRenderStateDefinition>>;

  if (definitions.length !== 1) {
    throw new Error(
      `A lazy render-state module must export exactly one defined render state; received ${definitions.length}.`,
    );
  }

  const definition = definitions[0][definedRenderStateSymbol];
  return isLazyRenderState(definition)
    ? findDefinedRenderState(await definition[lazyRenderStateSymbol]())
    : definition;
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
