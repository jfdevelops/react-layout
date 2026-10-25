import { stateReferenceSource, type StateComposableSource } from './state-composable';
import type { LayoutNameInput, LayoutNameContext, LayoutNameResolver, ResolvedLayoutName } from './layout-name';
import { mergeLayoutProps } from './merge-layout-props';
import { createPreviewComponent } from './preview';
import { getLayoutDebug, layoutPreviewFixtures, inspectionId } from '@jfdevelops/react-layout-devtools-core';
import { inspectDefinition, trackComposable, type ActiveInspection } from './inspection';
import {
  Component as ReactComponent,
  lazy,
  createContext,
  type JSX,
  type ReactNode,
  Suspense,
  useContext,
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  type ComposableComponents,
  type ComposableNameContext,
  type ComposableResourceLayout,
  type CreateLayoutComposable,
  collectComposablePresetEntries,
  LayoutComposablePresetProvider,
  MakeComposable,
  makeComposable,
  MakeComposableOptions,
  RequiredPresetLayoutProps,
  resolveLayoutComposables,
} from '@jfdevelops/react-layout-composables';
import {
  LayoutConfigurationError,
  MissingResourceProviderError,
  ResourceModuleLoadError,
  ResourceRenderError,
} from '../errors';
import {
  type AnyBuiltPropDefinition,
  attachComponentPropDefinitions,
  componentPropDefinitionsSymbol,
  createPrimitivePropBuilder,
  createProp,
  type ResolveLayoutProps,
  type ResolveProps,
  resolvePropDefinitionValues,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import {
  IncludedProps,
  IncludedComponentPropDefinitions,
  type IncludedPropBehavior,
  InferredInProps,
  InPropsDefinition,
  InPropsObject,
  LayoutRenderProps,
  MergedLayoutInProps,
  ResolvedIncludedComponentProps,
  ResolvedIncludedConfigProps,
  ResolvedIncludedProps,
} from '../props';
import {
  createIsValidResourceFn,
  normalizeResourceDefinitions,
  normalizeResources,
  toResourceEnum,
  type LayoutResourceKey,
  type NormalizedResourceDefinitions,
  type ResourceDefinition,
  type ResourceDefinitionValue,
} from '../resource';
import { BaseComponent, functionalUpdate, pick, Show, Updater } from '../utils';
import { capitalize } from '../utils/capitalize';
import { InvalidConfigError } from '../errors';
import { isResourceConfigComponentKey } from './component-keys';
import {
  type CreateResourceConfigFn,
  createResourceConfig,
} from './get-component';
import type { AssertUnreservedResources } from './types';
import {
  createResourceLinksFn,
  type CreateResourceLinksFn,
} from './create-resource-links';
import {
  createForResource,
  type CreateLayoutForResource,
  type CreateResourceLayoutOptions,
  type CreateResourceLayoutOptionsBase,
} from './for-resource';
import {
  createForResources,
  type CreateResourceLayoutForResourcesFn,
} from './for-resources';
import {
  type ResourceLayoutShellPublisher,
  ResourceLayoutShellPublisherContext,
  useResourceLayoutShellPublisher,
} from './shell-context';
import {
  type AnyRenderStateDefinition,
  type RenderStateName,
  type RenderStateReferences,
  deferredRenderStateSymbol,
  definedResourceLayoutComponentSymbol,
  findDefinedRenderState,
  isDeferredRenderState,
  isLazyRenderState,
  lazyRenderStateSymbol,
} from './render-state';
import {
  createStateReferences,
  StateComposableContext,
  type RenderStateScope,
} from './state-composable';

export type LayoutIncludeProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = IncludedProps<MergedLayoutInProps<Resources, Options, Composables>>;

export type LayoutProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * Props to include in the layout.
   */
  include?: LayoutIncludeProps<Resources, Options, Composables> & IncludeProps;
  /**
   * Custom props that the layout will receive.
   */
  custom?: CustomProps;
};

type LayoutRenderContext<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Composables extends ComposableComponents,
> = {
  composables: LayoutRenderComposables<Composables>;
  inProps: Record<string, unknown>;
  /**
   * @deprecated Use `resources.current` instead. `resource` will be removed in
   * the next major version.
   */
  resource: LayoutResourceKey<Resources>;
  /**
   * Accessor for the resources bound to this definition. Read `resources.current`
   * for the resource this instance renders, call `resources()` for normalized
   * definitions, `resources.raw()` for the original value, use
   * `resources.pick(...)` / `resources.omit(...)` to filter, or
   * `resources.isResource(...)` to narrow an unknown value.
   */
  resources: LayoutRenderResourcesAccessor<Resources>;
  name: string;
  /** Retries the active lazy state when the current Error state was automatic. */
  retry?: () => void;
};

type RenderStateBoundaryProps = {
  children: ReactNode;
  fallback: (error: unknown, retry: () => void) => ReactNode;
  onRetry?: () => void;
};

const RenderStateRetryContext = createContext<(() => void) | undefined>(
  undefined,
);

class RenderStateBoundary extends ReactComponent<
  RenderStateBoundaryProps,
  { error?: unknown }
> {
  state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  retry = () => {
    this.props.onRetry?.();
    this.setState({ error: undefined });
  };

  render() {
    if (this.state.error !== undefined) {
      return this.props.fallback(this.state.error, this.retry);
    }

    return this.props.children;
  }
}

function toResourceStateError(
  resource: string,
  state: string,
  error: unknown,
) {
  return error instanceof ResourceModuleLoadError ||
    error instanceof ResourceRenderError
    ? error
    : new ResourceRenderError(resource, state, error);
}

/**
 * A single {@link ResourceDefinition} kept by a `pick`, or `never` when it does
 * not match. Widened definitions (`string`, `{ value: string }`) are always
 * kept — the concrete keys are not known statically, so the runtime filter is
 * the source of truth.
 */
type PickResourceDefinition<
  Definition,
  Keys extends string,
> = Definition extends ResourceDefinition
  ? string extends ResourceDefinitionValue<Definition>
    ? Definition
    : ResourceDefinitionValue<Definition> extends Keys
      ? Definition
      : never
  : never;

type PickResourceDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Keys extends LayoutResourceKey<Resources>,
> = Array<PickResourceDefinition<Resources[number], Keys>>;

/**
 * A single {@link ResourceDefinition} kept by an `omit`, or `never` when it is
 * one of the omitted keys. Widened definitions are always kept.
 */
type OmitResourceDefinition<
  Definition,
  Keys extends string,
> = Definition extends ResourceDefinition
  ? string extends ResourceDefinitionValue<Definition>
    ? Definition
    : ResourceDefinitionValue<Definition> extends Keys
      ? never
      : Definition
  : never;

type OmitResourceDefinitions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Keys extends LayoutResourceKey<Resources>,
> = Array<OmitResourceDefinition<Resources[number], Keys>>;

/**
 * The result of `resources.pick(...)` / `resources.omit(...)`.
 *
 * - calling it returns the selected resource definitions.
 * - `.isResource(value)` narrows an unknown value to one of the selected keys.
 */
export type ResourceSelection<
  Definitions extends ReadonlyArray<ResourceDefinition>,
> = {
  /** Returns the selected resource definitions. */
  (): Show<Definitions>;
  /**
   * Narrows an unknown value to one of the selected resource keys.
   *
   * @param value - The value to test.
   */
  isResource(value: unknown): value is LayoutResourceKey<Definitions>;
};

/**
 * Accessor for the resources bound to a `defineResourceLayout` definition.
 *
 * - `resources()` returns normalized `{ value, subResources? }` definitions.
 * - `resources.raw()` returns the definitions exactly as declared.
 * - `resources.omit(key, ...rest)` selects every resource except the named ones.
 * - `resources.pick(key, ...rest)` selects only the named resources.
 * - `resources.isResource(value)` narrows an unknown value to a resource key.
 *
 * `pick` / `omit` return a {@link ResourceSelection} thunk: call it for the
 * definitions, or use its `isResource` guard.
 */
export type LayoutResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  /**
   * Returns normalized resources, or the result of an optional selector.
   *
   * @param select - Transforms the normalized tuple without losing its literal
   * resource and sub-resource types.
   */
  <Selected = NormalizedResourceDefinitions<Resources>>(
    select?: (resources: NormalizedResourceDefinitions<Resources>) => Selected,
  ): Selected;
  /**
   * Returns the original resource declarations, or an optionally selected
   * value derived from them.
   *
   * @param select - Transforms the original tuple exactly as it was declared.
   */
  raw<Selected = Resources>(
    select?: (resources: Resources) => Selected,
  ): Selected;
  /**
   * Narrows an unknown value to one of this definition's top-level resource
   * keys.
   *
   * @param value - The value to test.
   */
  isResource(value: unknown): value is LayoutResourceKey<Resources>;
  /**
   * Selects every declared resource except the named ones. Requires at least
   * one key.
   *
   * @param keys - Top-level resource names to exclude.
   */
  omit<
    Keys extends [
      LayoutResourceKey<Resources>,
      ...LayoutResourceKey<Resources>[],
    ],
  >(
    ...keys: Keys
  ): ResourceSelection<OmitResourceDefinitions<Resources, Keys[number]>>;
  /**
   * Selects only the named resources. Requires at least one key.
   *
   * @param keys - Top-level resource names to keep.
   */
  pick<
    Keys extends [
      LayoutResourceKey<Resources>,
      ...LayoutResourceKey<Resources>[],
    ],
  >(
    ...keys: Keys
  ): ResourceSelection<PickResourceDefinitions<Resources, Keys[number]>>;
};

/**
 * Render-scoped {@link LayoutResourcesAccessor}, extended with `current` — the
 * resource key the layout instance is rendering for.
 */
export type LayoutRenderResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = LayoutResourcesAccessor<Resources> & {
  /** The resource this layout instance is rendering for. */
  readonly current: LayoutResourceKey<Resources>;
};

function createResourceSelection(
  definitions: ReadonlyArray<ResourceDefinition>,
): ResourceSelection<ReadonlyArray<ResourceDefinition>> {
  const selection = (() => definitions) as ResourceSelection<
    ReadonlyArray<ResourceDefinition>
  >;

  selection.isResource = createIsValidResourceFn(definitions);

  return selection;
}

/**
 * Creates the callable resource accessor shared by global and bound layout
 * definitions.
 *
 * @param resources - Resource definitions to expose and normalize.
 * @returns A callable normalized accessor with raw, selection, and guard APIs.
 * @internal
 */
export function createLayoutResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): LayoutResourcesAccessor<Resources> {
  const normalizedResources = normalizeResourceDefinitions(resources);
  const accessor = ((
    select?: (value: typeof normalizedResources) => unknown,
  ) =>
    select
      ? select(normalizedResources)
      : normalizedResources) as LayoutResourcesAccessor<Resources>;

  accessor.raw = ((select?: (value: Resources) => unknown) =>
    select
      ? select(resources)
      : resources) as LayoutResourcesAccessor<Resources>['raw'];
  accessor.isResource = createIsValidResourceFn(resources);
  accessor.omit = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter(
        (resource) => !keys.includes(readResourceSlug(resource)),
      ),
    )) as LayoutResourcesAccessor<Resources>['omit'];
  accessor.pick = ((...keys: string[]) =>
    createResourceSelection(
      resources.filter((resource) =>
        keys.includes(readResourceSlug(resource)),
      ),
    )) as LayoutResourcesAccessor<Resources>['pick'];

  return accessor;
}

function createLayoutRenderResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(
  resources: Resources,
  current: LayoutResourceKey<Resources>,
): LayoutRenderResourcesAccessor<Resources> {
  return Object.assign(createLayoutResourcesAccessor(resources), { current });
}
type LayoutRenderComposables<Composables extends ComposableComponents> = [
  keyof Composables,
] extends [never]
  ? undefined
  : Composables;

type SplitLayoutInPropDefinition<
  Props extends InPropsObject = {},
  Content = unknown,
> = {
  props?: Props;
  render: ((props: ResolveProps<Props>) => Content) | Content;
};

function isBuiltPropDefinition(
  value: unknown,
): value is AnyBuiltPropDefinition {
  return typeof value === 'function' && value !== null && 'visibility' in value;
}

function isSplitLayoutInPropDefinition(
  value: unknown,
): value is SplitLayoutInPropDefinition {
  return (
    value !== null &&
    typeof value === 'object' &&
    'render' in value &&
    (value as { render?: unknown }).render !== undefined
  );
}

function isJSXElementDefinition(
  definition: unknown,
): definition is AnyBuiltPropDefinition & { type: 'JSX.Element' } {
  return (
    isBuiltPropDefinition(definition) &&
    'type' in definition &&
    definition.type === 'JSX.Element'
  );
}

function toLayoutRenderPropKey(includeKey: string, definition: unknown) {
  return isJSXElementDefinition(definition)
    ? capitalize(includeKey)
    : includeKey;
}

function readLayoutOptionValue(
  includeKey: string,
  definition: unknown,
  sources: Record<string, unknown>,
) {
  const layoutOptionKeys = isJSXElementDefinition(definition)
    ? [capitalize(includeKey), includeKey]
    : [includeKey, capitalize(includeKey)];

  for (const key of layoutOptionKeys) {
    if (key in sources) {
      return sources[key];
    }
  }

  return undefined;
}

function getIncludedPropBehavior(value: unknown): IncludedPropBehavior | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    'visibility' in value &&
    'passthrough' in value
  ) {
    return value as IncludedPropBehavior;
  }

  return null;
}

function isIncludedPropRequired(value: unknown) {
  return (
    value === true ||
    value === 'required' ||
    getIncludedPropBehavior(value)?.visibility === 'required'
  );
}

function allowsConfigPassthrough(value: unknown) {
  const behavior = getIncludedPropBehavior(value);

  if (!behavior) {
    return true;
  }

  if (behavior.passthrough === 'config') {
    return true;
  }

  // optional + component passthrough still accepts create-time defaults
  return (
    behavior.passthrough === 'component' && behavior.visibility === 'optional'
  );
}

function allowsComponentPassthrough(value: unknown) {
  const behavior = getIncludedPropBehavior(value);

  return behavior ? behavior.passthrough === 'component' : value === 'optional';
}

function splitLayoutInProps(inProps: Record<string, unknown>) {
  const resolvedInProps: Record<string, AnyBuiltPropDefinition> = {};
  const splitInProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inProps)) {
    if (isBuiltPropDefinition(value)) {
      resolvedInProps[key] = value;
      continue;
    }

    if (isSplitLayoutInPropDefinition(value)) {
      splitInProps[key] = value.render;

      if (value.props && typeof value.props === 'object') {
        Object.assign(resolvedInProps, value.props);
      }
    }
  }

  return {
    resolvedInProps,
    splitInProps,
  };
}

function resolveLayoutOptionDefaults(
  defaults: Record<string, unknown>,
  options: Record<string, unknown>,
) {
  const resolved = { ...options };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (key in options) {
      if (typeof defaultValue === 'function') {
        resolved[key] = options[key];
      } else {
        resolved[key] = functionalUpdate(
          defaultValue,
          options[key] as Updater<unknown>,
        );
      }
    }
  }

  return resolved;
}

/**
 * The `layout` block of a {@link defineResourceLayout} call: the props, the
 * composable map, and the render for a per-resource page component.
 *
 * Extracted so {@link defineResourceLayout.withLayout} can reuse the exact same
 * shape while making `render` optional (see {@link ShellLayoutDefinition}).
 */
type LayoutRenderFunction<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
> = (
  props: LayoutRenderProps<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >,
  context: LayoutRenderContext<Resources, Composables>,
) => JSX.Element;

type RenderStateComposables<Input> = Input extends {
  composables?: (...arguments_: any[]) => infer Composables extends ComposableComponents;
}
  ? Composables
  : {};

type ContextualRenderStateIncludeProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = RenderStateIncludeProps<Input> extends LayoutIncludeProps<
  Resources,
  Options,
  Composables
>
  ? RenderStateIncludeProps<Input>
  : LayoutIncludeProps<Resources, Options, Composables>;

type ValidRenderStateIncludes<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = {
  [Key in keyof RenderStateIncludeProps<Input>]: Key extends keyof LayoutIncludeProps<Resources, Options, Composables>
    ? RenderStateIncludeProps<Input>[Key]
    : never;
};

type ContextualStateRenderFunction<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = LayoutRenderFunction<
  Resources,
  Options,
  Composables & RenderStateComposables<Input>,
  ContextualRenderStateIncludeProps<
    Resources,
    Options,
    Composables & RenderStateComposables<Input>,
    Input
  >,
  RenderStateCustomProps<Input>
>;

type ContextualStateLayoutProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
> = LayoutProps<
  Resources,
  Options,
  Composables & RenderStateComposables<Input>,
  ContextualRenderStateIncludeProps<
    Resources, Options, Composables & RenderStateComposables<Input>, Input
  >,
  RenderStateCustomProps<Input>
> & {
  include?: ValidRenderStateIncludes<
    Resources, Options, Composables & RenderStateComposables<Input>, Input
  >;
};

type RenderStateConfiguration<Input> = Pick<
  Input, keyof Input & ('props' | 'composables' | 'state')
>;

type ContextualLayoutRenderState<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Input,
  States,
  BaseInclude extends LayoutIncludeProps<Resources, Options, Composables> = {},
  BaseCustom extends InPropsObject = {},
> =
  | LayoutRenderFunction<Resources, Options, Composables, BaseInclude, BaseCustom>
  | CreatedRenderState
  | (RenderStateConfiguration<Input> & {
      props?: ContextualStateLayoutProps<Resources, Options, Composables, Input>;
      composables?: (
        create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
        states: RenderStateReferences<Resources, Options, Composables, States>,
      ) => ComposableComponents;
      render: ContextualStateRenderFunction<Resources, Options, Composables, PlainStateWithDefaults<Input, BaseInclude, BaseCustom>>;
      state?: RenderStateName;
    });

type ContextualLayoutRenderStates<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  States,
  BaseInclude extends LayoutIncludeProps<Resources, Options, Composables> = {},
  BaseCustom extends InPropsObject = {},
> = {
  [State in keyof States]: ContextualLayoutRenderState<
    Resources, Options, Composables, States[State], States, BaseInclude, BaseCustom
  >;
} & { default: unknown };

/**
 * Contextual shape applied to each inline `layout.render` entry. It prevents
 * callback parameters from falling back to implicit `any` and exposes both
 * layout-level and state-local composables through the render context.
 */
export type ContextualInlineRenderState<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  LayoutComposables extends ComposableComponents,
> =
  | LayoutRenderFunction<Resources, Options, LayoutComposables, {}, {}>
  | {
      props?: {
        include?: LayoutIncludeProps<
          Resources,
          Options,
          LayoutComposables & ComposableComponents
        >;
        custom?: InPropsObject;
      };
      composables?: (
        create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
      ) => ComposableComponents;
      render: LayoutRenderFunction<
        Resources,
        Options,
        LayoutComposables & ComposableComponents,
        LayoutIncludeProps<
          Resources,
          Options,
          LayoutComposables & ComposableComponents
        >,
        Record<string, any>
      >;
      state?: string;
    };

/**
 * Requires a `default` inline state while allowing named built-in or custom
 * states to share the same contextual callback typing.
 */
export type ContextualInlineRenderStates<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  LayoutComposables extends ComposableComponents,
> = {
  [State in RenderStateName]?:
    | ContextualInlineRenderState<Resources, Options, LayoutComposables>
    | CreatedRenderState
    | (AnyRenderStateDefinition & { state: RenderStateName });
} & {
  default:
    | ContextualInlineRenderState<Resources, Options, LayoutComposables>
    | CreatedRenderState
    | (AnyRenderStateDefinition & { state: RenderStateName });
};

/** An inline state with independently inferred props and composables. */
export type TypedInlineRenderState<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  LayoutComposables extends ComposableComponents,
  StateComposables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    LayoutComposables & StateComposables
  >,
  CustomProps extends InPropsObject,
> = {
  props?: {
    include?: IncludeProps;
    custom?: CustomProps;
  };
  composables?: (
    create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
  ) => StateComposables;
  render: LayoutRenderFunction<
    Resources,
    Options,
    LayoutComposables & StateComposables,
    IncludeProps,
    CustomProps
  >;
  state?: string;
};

type CreatedRenderState =
  | import('./render-state').DeferredRenderState<AnyRenderStateDefinition>
  | import('./render-state').LazyRenderState<AnyRenderStateDefinition>;

/**
 * State-map helper inferred from the complete render object, including custom
 * states. Built-in states use the same inference as every other key.
 */
export type TypedBuiltInRenderStates<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Render extends { default: unknown },
> = ContextualLayoutRenderStates<Resources, Options, Composables, Render>;

type LayoutRenderInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
> =
  | LayoutRenderFunction<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >
  | ContextualInlineRenderStates<Resources, Options, Composables>;

export type LayoutDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
> = {
  /**
   * The props to pass to the layout.
   */
  props?: LayoutProps<Resources, Options, Composables, IncludeProps, CustomProps>;
  /**
   * Components used to compose the layout. Invoked per layout instance with
   * a scoped `create` that resolves composable `name` callbacks using the
   * layout's `resource` and `name`.
   */
  composables?: (
    create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
    states: {},
  ) => Composables;
  /**
   * The render function for the layout.
   */
  render: LayoutRenderInput<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >;
};

/** Complete input accepted by the unbound `defineResourceLayout` API. */
export type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
  Render = LayoutDefinition<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >['render'],
  Namespace extends boolean = false,
> = {
  /** Default naming convention for components created by this definition. */
  name?: LayoutNameInput<LayoutResourceKey<Resources>>;
  /** Default namespace mode for created layouts. Defaults to false. */
  namespace?: Namespace;
  /**
   * An array of valid resource names to support. Nested sub-resource slugs that
   * collide with config keys (`component`, `detail`, `new`, …) are reserved.
   */
  resources: AssertUnreservedResources<Resources>;
  /**
   * The options that are passed into the created resource layout.
   */
  options?: Options;
  layout: Omit<
    LayoutDefinition<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >,
    'render'
  > & {
    render:
      | LayoutRenderFunction<
          Resources,
          Options,
          Composables,
          IncludeProps,
          CustomProps
        >
      | (Render extends (...args: any[]) => any
          ? never
          : Render & ContextualInlineRenderStates<Resources, Options, Composables>);
  };
};

/**
 * Input for the callback shorthand of `layout.render`. Keeping the callback
 * concrete allows TypeScript to infer layout composables and included props
 * from their sibling definitions before contextually typing `render`.
 */
export type CreateViewMapFunctionRenderOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  Namespace extends boolean = false,
> = CreateViewMapOptions<
  Resources,
  Options,
  Composables,
  IncludeProps,
  CustomProps,
  LayoutRenderFunction<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >,
  Namespace
>;

/**
 * Resource-layout input that preserves the exact keys and definitions of an
 * object-form render-state map. Use `createRenderState` for scoped
 * `composables(create)` callbacks that need independent context inference.
 */
export type CreateViewMapRenderStatesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  RenderStates extends { default: unknown } & Record<string, unknown>,
  Namespace extends boolean = false,
> = Omit<
  CreateViewMapOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    RenderStates,
    Namespace
  >,
  'layout'
> & {
  layout: Omit<
    LayoutDefinition<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >,
    'render' | 'composables'
  > & {
    composables?: (
      create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
      states: RenderStateReferences<Resources, Options, {}, RenderStates>,
    ) => Composables;
    render: RenderStates & ContextualLayoutRenderStates<
      Resources,
      Options,
      Composables,
      RenderStates,
      IncludeProps,
      CustomProps
    > & Partial<Record<RenderStateName, unknown>>;
  };
};

/**
 * Object-form layout input that contextually types inline state callbacks.
 * Use {@link CreateViewMapRenderStatesOptions} when working with already
 * created state fragments instead.
 */
export type CreateViewMapInlineRenderStatesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  Namespace extends boolean = false,
> = Omit<
  CreateViewMapOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    Namespace
  >,
  'layout'
> & {
  layout: Omit<
    LayoutDefinition<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >,
    'render'
  > & {
    render: ContextualInlineRenderStates<
      Resources,
      Options,
      Composables
    >;
  };
};

/** Input for independently inferred built-in render states. */
export type CreateViewMapBuiltInRenderStatesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  Render extends { default: unknown } & Record<string, unknown>,
  Namespace extends boolean = false,
> = CreateViewMapRenderStatesOptions<
  Resources, Options, Composables, IncludeProps, CustomProps, Render,
  Namespace
>;

type UnwrapRenderState<Input> =
  Input extends import('./render-state').DeferredRenderState<
    infer Definition extends AnyRenderStateDefinition
  >
    ? Definition
    : Input extends import('./render-state').LazyRenderState<
          infer Definition extends AnyRenderStateDefinition
        >
      ? Definition
      : Input extends (...args: any[]) => any
        ? { render: Input }
        : Input;

type RenderStateCustomProps<Input> = UnwrapRenderState<Input> extends {
  props?: { custom?: infer CustomProps extends InPropsObject };
}
  ? CustomProps
  : {};

type RenderStateIncludeProps<Input> = UnwrapRenderState<Input> extends {
  props?: { include?: infer IncludeProps };
}
  ? IncludeProps
  : {};

function getSynchronousRenderStateDefinition(
  input: unknown,
  fallbackProps?: LayoutProps<any, any, any, any, any>,
): AnyRenderStateDefinition | undefined {
  if (isLazyRenderState(input)) {
    return undefined;
  }

  if (isDeferredRenderState(input)) {
    return input[deferredRenderStateSymbol];
  }

  if (typeof input === 'function') {
    return {
      props: fallbackProps,
      render: input as AnyRenderStateDefinition['render'],
    };
  }

  return typeof input === 'object' && input !== null
    ? (input as AnyRenderStateDefinition)
    : undefined;
}

type ResourceLayoutStateComponents<
  Name extends string,
  Resource extends string,
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  States
> = States extends Record<string, unknown>
  ? {
      [State in Exclude<keyof States & string, 'default'>]: BaseComponent<
        `${Name}.${State}`,
        Show<
          ResolveProps<RenderStateCustomProps<States[State]>> &
            ResolvedIncludedComponentProps<
              MergedLayoutInProps<Resources, Options, Composables>,
              RenderStateIncludeProps<States[State]> &
                LayoutIncludeProps<Resources, Options, Composables>
            >
        >
      > &
        ((props: Show<
          ResolveProps<RenderStateCustomProps<States[State]>> &
            ResolvedIncludedComponentProps<
              MergedLayoutInProps<Resources, Options, Composables>,
              RenderStateIncludeProps<States[State]> &
                LayoutIncludeProps<Resources, Options, Composables>
            >
        >) => JSX.Element) & {
          readonly resource: Resource;
        };
    }
  : {};

type ResourceLayoutComposition<
  Name extends string,
  Composables extends ComposableComponents,
> = [keyof Composables] extends [never]
  ? {}
  : {
      makeComposable: MakeComposable<Composables, Name>;
    };
export type ResourceLayoutComponent<
  Name extends string,
  Props extends InPropsObject = {},
  Composables extends ComposableComponents = {},
  Resource extends string = string,
  IncludedCallProps extends object = {},
  States = {},
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  PropDefinitions extends InPropsObject = Props,
> = ResourceLayoutComposition<Name, Composables> &
  BaseComponent<Name, Show<ResolveProps<Props> & IncludedCallProps>> & {
    (props: Show<ResolveProps<Props> & IncludedCallProps>): JSX.Element;
    /**
     * A type-only property containing the resource associated with this
     * component. This property is `undefined` at runtime.
     */
    readonly resource: Resource;
    readonly [definedResourceLayoutComponentSymbol]: true;
    readonly [componentPropDefinitionsSymbol]: PropDefinitions;
  } &
  ResourceLayoutStateComponents<
    Name,
    Resource,
    Resources,
    Options,
    Composables,
    States
  >;

export type LayoutPropsForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
> = [keyof IncludeProps] extends [never]
  ? ResolveLayoutProps<InferredInProps<Resources, InProps>> &
      RequiredPresetLayoutProps<Composables>
  : ResolvedIncludedConfigProps<
      MergedLayoutInProps<Resources, InProps, Composables>,
      IncludeProps
    >;

type DefaultStateIncludes<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  States,
  Fallback extends LayoutIncludeProps<Resources, Options, Composables>,
> = States extends { default: infer Default }
  ? ContextualRenderStateIncludeProps<Resources, Options, Composables, Default>
  : Fallback;

/** A plain object namespace; the callable default component lives under Root. */
type ResourceLayoutNamespace<Component> = { Root: Component } & {
  [Key in keyof Component as Key extends string
    ? Key extends 'displayName' | 'props' | 'resource' | 'makeComposable'
      ? never
      : Key
    : never]: Component[Key];
};

export type ResourceLayoutResult<Component, Namespace extends boolean> =
  Namespace extends true ? ResourceLayoutNamespace<Component> : Component;

type CreateResourceLayoutFnImpl<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
  States = {},
  DefaultNamespace extends boolean = false,
  DefaultNaming extends LayoutNameInput<any, any> | undefined = undefined,
> = (<
  const Name extends string,
  const Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
  Namespace extends boolean = DefaultNamespace,
>(
  options: Omit<CreateResourceLayoutOptions<Resources, InProps, Composables, IncludeProps, string, Resource, Props, Namespace>, 'name'> &
    { name: Name },
) => Show<ResourceLayoutResult<ResourceLayoutComponent<
  Name,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
  >,
  States,
  Resources,
  InProps,
  CustomProps &
    IncludedComponentPropDefinitions<
      MergedLayoutInProps<Resources, InProps, Composables>,
      DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
    >
>, Namespace>>) & (<
  const Resource extends LayoutResourceKey<Resources>,
  const Naming extends LayoutNameResolver<string, any>,
  Props extends InPropsObject = {},
  Namespace extends boolean = DefaultNamespace,
>(
  options: Omit<CreateResourceLayoutOptions<Resources, InProps, Composables, IncludeProps, string, Resource, Props, Namespace>, 'name'> &
    { name: Naming },
) => Show<ResourceLayoutResult<ResourceLayoutComponent<
  ResolvedLayoutName<Naming, Resource>,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
  >,
  States,
  Resources,
  InProps,
  CustomProps &
    IncludedComponentPropDefinitions<
      MergedLayoutInProps<Resources, InProps, Composables>,
      DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
    >
>, Namespace>>) & (<
  const Resource extends LayoutResourceKey<Resources>,
  const Name extends string,
  Props extends InPropsObject = {},
  Namespace extends boolean = DefaultNamespace,
>(
  options: Omit<CreateResourceLayoutOptions<Resources, InProps, Composables, IncludeProps, string, Resource, Props, Namespace>, 'name'> &
    { name: (context: LayoutNameContext<Resource, ('default' | keyof States) & string>) => Name },
) => Show<ResourceLayoutResult<ResourceLayoutComponent<
  Name,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
  >,
  States,
  Resources,
  InProps,
  CustomProps &
    IncludedComponentPropDefinitions<
      MergedLayoutInProps<Resources, InProps, Composables>,
      DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
    >
>, Namespace>>) & ([DefaultNaming] extends [undefined] ? {} : (<
  const Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
  Namespace extends boolean = DefaultNamespace,
>(
  options: Omit<CreateResourceLayoutOptions<Resources, InProps, Composables, IncludeProps, string, Resource, Props, Namespace>, 'name'> &
    { name?: never },
) => Show<ResourceLayoutResult<ResourceLayoutComponent<
  ResolvedLayoutName<DefaultNaming, Resource>,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
  >,
  States,
  Resources,
  InProps,
  CustomProps &
    IncludedComponentPropDefinitions<
      MergedLayoutInProps<Resources, InProps, Composables>,
      DefaultStateIncludes<Resources, InProps, Composables, States, IncludeProps>
    >
>, Namespace>>));

export type CreateResourceLayoutMakeComposableOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
> = CreateResourceLayoutOptionsBase<Resources, Name, Resource, Props> &
  Partial<
    LayoutPropsForResource<Resources, InProps, Composables, IncludeProps>
  >;

type CreateResourceLayoutMakeComposableFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
> = <
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
>(
  options: CreateResourceLayoutMakeComposableOptions<
    Resources,
    InProps,
    Composables,
    Name,
    Resource,
    Props,
    IncludeProps
  >,
) => ComposableResourceLayout<Composables, Name, any, any, any>;

type CreateResourceLayoutFnBase<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
  States = {},
  DefaultNamespace extends boolean = false,
  DefaultNaming extends LayoutNameInput<any, any> | undefined = undefined,
> = CreateResourceLayoutFnImpl<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps,
  States,
  DefaultNamespace,
  DefaultNaming
> & {
  /**
   * A function to create a resource layout for a specific resource.
   */
  forResource: CreateLayoutForResource<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    DefaultNamespace,
    States
  >;
  /**
   * Creates resource layout factories for multiple defined resources.
   */
  forResources: CreateResourceLayoutForResourcesFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    DefaultNamespace,
    States
  >;
};

type CreateResourceLayoutMakeComposableMember<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
> = [keyof Composables] extends [never]
  ? {}
  : {
      makeComposable: CreateResourceLayoutMakeComposableFn<
        Resources,
        InProps,
        Composables,
        IncludeProps,
        CustomProps
      >;
    };

export type CreateResourceLayoutFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
  States = {},
  DefaultNamespace extends boolean = false,
  DefaultNaming extends LayoutNameInput<any, any> | undefined = undefined,
> = CreateResourceLayoutFnBase<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps,
  States,
  DefaultNamespace,
  DefaultNaming
> &
  CreateResourceLayoutMakeComposableMember<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;

export type DefinedResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
  States = {},
  DefaultNamespace extends boolean = false,
  DefaultNaming extends LayoutNameInput<any, any> | undefined = undefined,
> = {
  createResourceConfig: CreateResourceConfigFn<Resources>;
  createResourceLayout: CreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    States,
    DefaultNamespace,
    DefaultNaming
  >;
  createResourceLinks: CreateResourceLinksFn<Resources>;
  /**
   * Accessor for the resources bound to this definition. Call `resources()` for
   * normalized definitions, `resources.raw()` for their declared form, or use
   * `resources.pick(...)` / `resources.omit(...)` to filter.
   */
  resources: LayoutResourcesAccessor<Resources>;
  /**
   * Provides the current resource to descendants that call `useResource`.
   * Components created by `createResourceLayout` install this provider
   * automatically.
   */
  ResourceProvider: ResourceLayoutProvider<Resources>;
  /** Returns the nearest current resource. */
  useResource: () => LayoutResourceKey<Resources>;
};

export type ResourceLayoutProviderProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  children: ReactNode;
  resource: LayoutResourceKey<Resources>;
};

export type ResourceLayoutProvider<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = (props: ResourceLayoutProviderProps<Resources>) => JSX.Element;

function readResourceSlug(resource: ResourceDefinition) {
  return typeof resource === 'string' ? resource : resource.value;
}

function assertUnreservedResourceSlugs(
  resources: ReadonlyArray<ResourceDefinition>,
  owner?: string,
) {
  for (const resource of resources) {
    const slug = readResourceSlug(resource);

    if (owner !== undefined && isResourceConfigComponentKey(slug)) {
      throw new InvalidConfigError({
        reason: `Sub-resource "${slug}" under "${owner}" collides with a reserved config key`,
      });
    }

    if (typeof resource !== 'string') {
      assertUnreservedResourceSlugs(resource.subResources, slug);
    }
  }
}

function defineResourceLayoutImpl<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  const IncludeProps extends LayoutIncludeProps<
    Resources,
    InProps,
    Composables
  > = {},
  CustomProps extends InPropsObject = {},
  const Render = LayoutDefinition<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >['render'],
>(
  options: CreateViewMapOptions<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    Render,
    boolean
  >,
  inheritedStateScope?: RenderStateScope,
  inheritedInspection?: ActiveInspection,
): DefinedResourceLayout<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps,
  Render extends Record<string, unknown> ? Render : {}
> {
  const {
    options: inProps = {} as InProps,
    resources,
    layout,
    namespace: defaultNamespace = false,
  } = options;
  // Internal, set only by `defineResourceLayout.withLayout`: the identity of the
  // owning definition, forwarded when a page reports its resource so the shell
  // can tell its own pages apart from ones belonging to another definition.
  const shellId = (options as { shellId?: symbol }).shellId;

  const inspection = inheritedInspection ? undefined : inspectDefinition(resources, getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source);
  if (inspection) inspection.store.node({ id: inspection.definition, kind: 'definition', label: 'Layout definition', source: getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source, details: {
    props: layout.props,
    propSchemas: typeof inProps === 'function' ? undefined : inProps,
    options: typeof inProps === 'function' ? 'Resource-specific schemas' : Object.keys(inProps),
    states: typeof layout.render === 'function' ? ['default'] : Object.keys(layout.render),
  } });
  assertUnreservedResourceSlugs(resources);

  const resourcesAccessor = createLayoutResourcesAccessor(resources);
  const ResourceContext = createContext<
    LayoutResourceKey<Resources> | undefined
  >(undefined);

  function ResourceProvider({
    children,
    resource,
  }: ResourceLayoutProviderProps<Resources>) {
    return (
      <ResourceContext.Provider value={resource}>
        {children}
      </ResourceContext.Provider>
    );
  }

  function useResource() {
    const resource = useContext(ResourceContext);

    if (resource === undefined) {
      throw new MissingResourceProviderError({});
    }

    return resource;
  }

  const normalizedResources = normalizeResources(resources);
  const resourcesEnum = createPrimitivePropBuilder('string').enum(
    toResourceEnum(normalizedResources),
  );
  const definedResourceLayout = (<
    Name extends string,
    Resource extends LayoutResourceKey<Resources>,
    Props extends InPropsObject = {},
  >(
    layoutOptions: CreateResourceLayoutOptions<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      Name,
      Resource,
      Props,
      boolean
    >,
  ) => {
    const {
      name: suppliedName,
      props: instancePropDefinitions,
      namespace = defaultNamespace,
      ...layoutOptionProps
    } = layoutOptions;
    const naming = suppliedName ?? options.name;
    const name = (typeof naming === 'function' ? naming({
      resource: layoutOptions.resource,
      states: typeof layout.render === 'function' ? ['default'] : Object.keys(layout.render),
      capitalize,
    }) : naming) as Name;
    if (name !== undefined && (typeof name !== 'string' || !name)) throw new LayoutConfigurationError('A non-empty layout name is required');
    const createComposableLayout =
      makeComposable<
        LayoutRenderProps<
          Resources,
          InProps,
          Composables,
          IncludeProps,
          CustomProps
        >
      >();
    const nameProp = createProp.string().literal(name);
    const rawResolvedOptions =
      typeof inProps === 'function'
        ? inProps({
            resource: resourcesEnum,
            name: nameProp,
          })
        : inProps;
    const { resolvedInProps, splitInProps } = splitLayoutInProps({
      ...(rawResolvedOptions as Record<string, unknown>),
      ...(instancePropDefinitions as Record<string, unknown> | undefined),
      ...layoutOptionProps,
    });
    const { composables, props: legacyLayoutProps } = layout;
    const renderStates = (
      typeof layout.render === 'function'
        ? { default: layout.render }
        : layout.render
    ) as Record<string, unknown>;
    const inspectionStore = inheritedInspection?.store ?? inspection!.store;
    const layoutId = inheritedInspection?.layout ?? inspectionStore.node({
      id: inspectionId('layout'), kind: 'layout', label: name ?? String(layoutOptionProps.resource),
      source: getLayoutDebug(layoutOptions)?.source ?? getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source,
      registrationSource: getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source,
      details: { resource: layoutOptionProps.resource, props: legacyLayoutProps, propSchemas: rawResolvedOptions },
    });
    const resourceId = inheritedInspection?.resource ?? inspection?.resourceIds.get(String(layoutOptionProps.resource));
    if (inspection) {
      inspectionStore.edge(inspection.definition, layoutId, 'defines');
      if (resourceId) inspectionStore.edge(resourceId, layoutId, 'renders');
    }
    const stateIds = new Map(Object.keys(renderStates).map(state => [state,
      inheritedInspection?.state ?? inspectionStore.node({ id: inspectionId('state'), kind: 'state', label: state,
        source: getLayoutDebug(renderStates[state])?.source ?? getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source,
        registrationSource: getLayoutDebug(options)?.source ?? getLayoutDebug(layout)?.source,
        unresolved: isLazyRenderState(renderStates[state]) || isDeferredRenderState(renderStates[state]),
      }),
    ]));
    for (const id of stateIds.values()) inspectionStore.edge(layoutId, id, 'defines');
    const activeInspection = { store: inspectionStore, layout: layoutId, resource: resourceId, state: stateIds.get('default')! };
    const referenceStateIds = new Map<unknown, string>();
    function getReferenceStateId(input: unknown, label: string) {
      let id = referenceStateIds.get(input);
      if (!id) {
        id = inspectionStore.node({ id: inspectionId('state-reference'), kind: 'state', label, details: { relationship: 'Referenced render state' } });
        referenceStateIds.set(input, id);
      }
      return id;
    }
    const referenceComponents = new Map<unknown, (props: Record<string, unknown>) => JSX.Element>();
    const stateScope: RenderStateScope = inheritedStateScope ?? {
      states: createStateReferences(renderStates),
      resolve(source) {
        for (const [stateName, input] of Object.entries(renderStates)) {
          if (input === source.input) {
            return stateName === 'default'
              ? Component as (props: Record<string, unknown>) => JSX.Element
              : stateComponents[stateName];
          }
        }
        let reference = referenceComponents.get(source.input);
        if (!reference) {
          reference = createStateComponent(
            source.name,
            source.input,
            false,
            source.fallbackStateName,
          );
          referenceComponents.set(source.input, reference);
        }
        return reference;
      },
    };
    const defaultRenderInput = renderStates.default;
    const createdDefaultState =
      isDeferredRenderState(defaultRenderInput) ||
      isLazyRenderState(defaultRenderInput);
    const defaultRenderDefinition =
      getSynchronousRenderStateDefinition(
        defaultRenderInput,
        legacyLayoutProps,
      ) ?? { render: () => null };

    if (
      typeof defaultRenderDefinition !== 'object' ||
      defaultRenderDefinition === null ||
      !('render' in defaultRenderDefinition) ||
      typeof defaultRenderDefinition.render !== 'function'
    ) {
      throw new LayoutConfigurationError(
        'The "default" render state must define a render function',
      );
    }

    const defaultState = defaultRenderDefinition as AnyRenderStateDefinition;
    if (!inheritedInspection) inspectionStore.node({ id: activeInspection.state, kind: 'state', label: 'default', unresolved: createdDefaultState,
      details: { props: mergeLayoutProps(legacyLayoutProps, defaultState.props), propSchemas: rawResolvedOptions } });
    const render = defaultState.render;
    const layoutProps = mergeLayoutProps(legacyLayoutProps, defaultState.props);
    const customLayoutProps = layoutProps?.custom;
    const includeLayoutProps = layoutProps?.include;
    const layoutOptionValues = layoutOptionProps as Record<string, unknown>;
    const resolvedLayoutProps = {
      ...customLayoutProps,
    };
    const layoutContext: ComposableNameContext<
      LayoutResourceKey<Resources>,
      typeof name
    > = {
      resource: layoutOptions.resource,
      name,
      capitalize,
    };
    const validationContext = {
      layoutName: name,
      resource: layoutContext.resource,
    };
    const defaultComposables = composables || defaultState.composables
      ? (create: CreateLayoutComposable<LayoutResourceKey<Resources>>) => ({
          ...(composables?.(create, stateScope.states) ?? {}),
          ...defaultState.composables?.(create as never, stateScope.states),
        })
      : undefined;
    const resolvedComposables = defaultComposables
      ? { ...resolveLayoutComposables(defaultComposables as never, layoutContext) }
      : undefined;
    for (const [key, component] of Object.entries(resolvedComposables ?? {})) {
      const id = inspectionStore.node({ id: inspectionId('composable'), kind: 'composable', label: key, source: getLayoutDebug(component)?.source,
        details: { displayName: (component as { displayName?: string }).displayName, relationship: 'declared; may not be rendered' } });
      inspectionStore.edge(activeInspection.state, id, 'declares');
      resolvedComposables![key] = trackComposable(component, inspectionStore, id);
      const reference = (component as unknown as Record<symbol, StateComposableSource>)[stateReferenceSource];
      if (reference) {
        const stateName = Object.entries(renderStates).find(([, input]) => input === reference.input)?.[0];
        const target = stateName ? stateIds.get(stateName)! : getReferenceStateId(reference.input, reference.name);
        inspectionStore.edge(id, target, 'references');
      }
    }
    const mergedResolvedInProps = { ...resolvedInProps };

    for (const {
      props: presetPropDefinitions,
    } of collectComposablePresetEntries(resolvedComposables)) {
      Object.assign(mergedResolvedInProps, presetPropDefinitions);
    }

    const composablePresetProps = Object.fromEntries(
      collectComposablePresetEntries(resolvedComposables).map(
        ({ key, props: presetPropDefinitions }) => {
          const presetPropEntries = Object.entries(presetPropDefinitions);
          const validatedDefinitions = Object.fromEntries(
            presetPropEntries.filter(([propKey]) => {
              const includeBehavior = includeLayoutProps?.[propKey];

              return (
                includeBehavior === undefined ||
                (allowsConfigPassthrough(includeBehavior) &&
                  (isIncludedPropRequired(includeBehavior) ||
                    layoutOptionValues[propKey] !== undefined))
              );
            }),
          );
          const presetPropValues = Object.fromEntries(
            presetPropEntries.flatMap(([propKey]) =>
              propKey in layoutOptionValues
                ? [[propKey, layoutOptionValues[propKey]]]
                : [],
            ),
          );

          return [
            key,
            validateProps(
              validatedDefinitions as Record<string, AnyBuiltPropDefinition>,
              presetPropValues,
              validationContext,
            ),
          ];
        },
      ),
    );
    const mergedRenderContext = {
      composables: resolvedComposables as LayoutRenderComposables<Composables>,
      resource: layoutContext.resource,
      resources: createLayoutRenderResourcesAccessor(
        resources as Resources,
        layoutContext.resource,
      ),
      name: layoutContext.name,
      inProps: splitInProps,
    } as LayoutRenderContext<Resources, Composables>;
    const stateComponents: Record<
      string,
      (props: Record<string, unknown>) => JSX.Element
    > = {};
    let CreatedDefaultStateComponent:
      | ((props: Record<string, unknown>) => JSX.Element)
      | undefined;

    function RenderDefaultState({
      renderProps,
    }: {
      renderProps: LayoutRenderProps<
        Resources,
        InProps,
        Composables,
        IncludeProps,
        CustomProps
      >;
    }) {
      useLayoutEffect(() => {
        if (CreatedDefaultStateComponent) return;
        return inspectionStore.mount(activeInspection.layout, activeInspection.state, ...(resourceId ? [resourceId] : []));
      }, []);
      if (CreatedDefaultStateComponent) {
        return <CreatedDefaultStateComponent {...renderProps} />;
      }

      return render(renderProps, mergedRenderContext);
    }

    function Component(
      props: Show<
        ResolveProps<CustomProps> &
          ResolvedIncludedComponentProps<
            MergedLayoutInProps<Resources, InProps, Composables>,
            IncludeProps
          >
      >,
    ) {
      const publishResource = useResourceLayoutShellPublisher();

      // Report the resource this page renders for so an ancestor `Shell` (from
      // `defineResourceLayout.withLayout`) can resolve `resources.current` for
      // its own render without the consumer threading a route param down to it.
      // A layout effect, not a passive one, so the shell reflects the new
      // resource in the same commit the page mounts — a passive effect would
      // leave one painted frame of stale shell chrome mid-navigation. Degrades
      // to a no-op when rendered without a `Shell` (context defaults to null).
      useLayoutEffect(() => {
        publishResource?.(layoutContext.resource, shellId);

        return () => publishResource?.(undefined, shellId);
      }, [publishResource, layoutContext.resource]);

      const validatedProps = validateProps(resolvedLayoutProps, props, {
        ...validationContext,
      });
      const includedPropKeys = Object.keys(includeLayoutProps ?? {});
      const includedPropDefinitions = pick(
        mergedResolvedInProps,
        includedPropKeys,
      ) as Record<string, unknown>;
      const includedPropValues = {
        ...resolvePropDefinitionValues(includedPropDefinitions),
      } as Record<string, unknown>;

      for (const key of includedPropKeys) {
        const definition = mergedResolvedInProps[key];
        const includeBehavior = includeLayoutProps?.[key];
        const callSiteValue = allowsComponentPassthrough(includeBehavior)
          ? readLayoutOptionValue(
              key,
              definition,
              props as Record<string, unknown>,
            )
          : undefined;
        const layoutOptionValue = allowsConfigPassthrough(includeBehavior)
          ? readLayoutOptionValue(key, definition, layoutOptionValues)
          : undefined;
        const splitValue = key in splitInProps ? splitInProps[key] : undefined;
        const value = callSiteValue ?? layoutOptionValue ?? splitValue;

        if (value !== undefined) {
          includedPropValues[key] = value;
        }
      }

      const requiredIncludedPropDefinitions = Object.fromEntries(
        Object.entries(includedPropDefinitions).filter(([key]) =>
          isIncludedPropRequired(includeLayoutProps?.[key]),
        ),
      );
      const optionalIncludedPropDefinitions = Object.fromEntries(
        Object.entries(includedPropDefinitions).filter(
          ([key]) =>
            !isIncludedPropRequired(includeLayoutProps?.[key]) &&
            includedPropValues[key] !== undefined,
        ),
      );
      const validatedIncludedProps = validateProps(
        {
          ...requiredIncludedPropDefinitions,
          ...optionalIncludedPropDefinitions,
        } as Record<string, AnyBuiltPropDefinition>,
        includedPropValues,
        validationContext,
      );
      const layoutRenderIncludedProps = Object.fromEntries(
        includedPropKeys.flatMap((key) => {
          if (!(key in validatedIncludedProps)) {
            return [];
          }

          return [
            [
              toLayoutRenderPropKey(key, mergedResolvedInProps[key]),
              validatedIncludedProps[
                key as keyof typeof validatedIncludedProps
              ],
            ],
          ];
        }),
      );
      const layoutRenderProps = {
        ...validatedProps,
        ...layoutRenderIncludedProps,
      } as unknown as LayoutRenderProps<
        Resources,
        InProps,
        Composables,
        IncludeProps,
        CustomProps
      >;

      const rendered = (
        <ResourceProvider resource={layoutContext.resource}>
          <LayoutComposablePresetProvider value={composablePresetProps}>
            <StateComposableContext.Provider value={{ scope: stateScope, props: layoutRenderProps, definitions: mergedResolvedInProps }}>
              <RenderDefaultState renderProps={layoutRenderProps} />
            </StateComposableContext.Provider>
          </LayoutComposablePresetProvider>
        </ResourceProvider>
      );

      const ErrorComponent = stateComponents.Error;

      return ErrorComponent ? (
        <RenderStateBoundary
          fallback={(error, retry) => (
            <RenderStateRetryContext.Provider value={retry}>
              <ErrorComponent
                error={toResourceStateError(
                  String(layoutContext.resource),
                  'default',
                  error,
                )}
                retry={retry}
              />
            </RenderStateRetryContext.Provider>
          )}
        >
          {rendered}
        </RenderStateBoundary>
      ) : (
        rendered
      );
    }

    function createComposition<
      LayoutName extends string,
      const Defined extends MakeComposableOptions<Composables, LayoutName>,
    >(compositionOptions: Defined) {
      if (!compositionOptions.components) {
        return {} as ResourceLayoutComposition<LayoutName, Composables>;
      }

      return {
        makeComposable: createComposableLayout(
          compositionOptions,
        ) as MakeComposable<Composables, LayoutName>,
      };
    }

    function createStateComponent(
      stateName: string,
      input: unknown,
      validateStateName = true,
      fallbackStateName = stateName,
    ): (props: Record<string, unknown>) => JSX.Element {
      const inspectedId = validateStateName ? stateIds.get(stateName) : getReferenceStateId(input, stateName);
      if (isLazyRenderState(input)) {
        const loadState = input[lazyRenderStateSymbol];

        function createLazyState() {
          return lazy(async () => {
            const stateDefinition = await findDefinedRenderState(
              await loadState().catch((error: unknown) => {
                throw new ResourceModuleLoadError(
                  String(layoutContext.resource),
                  error,
                );
              }),
            );

            if (
              validateStateName && stateDefinition.state !== undefined &&
              stateDefinition.state !== stateName
            ) {
              throw new LayoutConfigurationError(
                `Lazy render state "${stateDefinition.state}" cannot be used as "${stateName}"`,
              );
            }

            return {
              default: createLoadedStateComponent(
                validateStateName ? stateName : stateDefinition.state ?? stateName,
                stateDefinition,
                inspectedId,
              ),
            };
          });
        }

        function LazyStateComponent(props: Record<string, unknown>) {
          const [, rerender] = useReducer((version) => version + 1, 0);
          const LazyState = useRef(createLazyState());
          const CurrentLazyState = LazyState.current;
          const LoadingComponent =
            fallbackStateName === 'Loading' ? undefined : stateComponents.Loading;
          const ErrorComponent =
            fallbackStateName === 'Error' ? undefined : stateComponents.Error;

          function retry() {
            LazyState.current = createLazyState();
            rerender();
          }

          const rendered = (
            <Suspense
              fallback={LoadingComponent ? <LoadingComponent /> : null}
            >
              <CurrentLazyState {...props} />
            </Suspense>
          );

          return ErrorComponent ? (
            <RenderStateBoundary
              fallback={(error, reset) => (
                <RenderStateRetryContext.Provider value={reset}>
                  <ErrorComponent
                    error={toResourceStateError(
                      String(layoutContext.resource),
                      stateName,
                      error,
                    )}
                    retry={reset}
                  />
                </RenderStateRetryContext.Provider>
              )}
              onRetry={retry}
            >
              {rendered}
            </RenderStateBoundary>
          ) : (
            rendered
          );
        }

        return LazyStateComponent;
      }

      const definition = isDeferredRenderState(input)
        ? input[deferredRenderStateSymbol]
        : typeof input === 'function'
          ? { render: input }
          : input;

      if (
        typeof definition !== 'object' ||
        definition === null ||
        !('render' in definition) ||
        typeof definition.render !== 'function'
      ) {
        throw new LayoutConfigurationError(
          `Render state "${stateName}" must define a render function`,
        );
      }

      const StateComponent = createLoadedStateComponent(
        stateName,
        definition as AnyRenderStateDefinition,
        inspectedId,
      );

      if (!isDeferredRenderState(input)) {
        return StateComponent;
      }

      const DeferredState = lazy(() =>
        Promise.resolve({ default: StateComponent }),
      );

      function DeferredStateComponent(props: Record<string, unknown>) {
        const LoadingComponent =
          fallbackStateName === 'Loading' ? undefined : stateComponents.Loading;
        const ErrorComponent =
          fallbackStateName === 'Error' ? undefined : stateComponents.Error;
        const rendered = (
          <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
            <DeferredState {...props} />
          </Suspense>
        );

        return ErrorComponent ? (
          <RenderStateBoundary
            fallback={(error, retry) => (
              <RenderStateRetryContext.Provider value={retry}>
                <ErrorComponent
                  error={toResourceStateError(
                    String(layoutContext.resource),
                    stateName,
                    error,
                  )}
                  retry={retry}
                />
              </RenderStateRetryContext.Provider>
            )}
          >
            {rendered}
          </RenderStateBoundary>
        ) : (
          rendered
        );
      }

      return DeferredStateComponent;
    }

    function createLoadedStateComponent(
      stateName: string,
      definition: AnyRenderStateDefinition,
      inspectedState = stateIds.get(stateName),
    ) {
      if (inspectedState) inspectionStore.node({ id: inspectedState, kind: 'state', label: stateName, unresolved: false, source: getLayoutDebug(definition)?.source, details: { props: mergeLayoutProps(legacyLayoutProps, definition.props), propSchemas: rawResolvedOptions } });
      const stateComposables = composables || definition.composables
        ? (create: CreateLayoutComposable<LayoutResourceKey<Resources>>) => ({
            ...(composables?.(create, stateScope.states) ?? {}),
            ...definition.composables?.(create as never, stateScope.states),
          })
        : undefined;
      const stateRender =
        stateName === 'Error'
          ? (props: Record<string, unknown>, context: Record<string, unknown>) => (
              <RenderStateRetryContext.Consumer>
                {(retry) =>
                  definition.render(props, {
                    ...context,
                    retry,
                  })
                }
              </RenderStateRetryContext.Consumer>
            )
          : definition.render;
      const stateLayout = defineResourceLayoutImpl({
        resources,
        options: inProps,
        layout: {
          composables: stateComposables,
          props: mergeLayoutProps(legacyLayoutProps, definition.props),
          render: stateRender,
        },
      } as never, stateScope, {
        ...activeInspection,
        state: inspectedState ?? getReferenceStateId(definition, stateName),
      });
      const StateComponent = stateLayout.createResourceLayout(
        { ...layoutOptions, name, namespace: false } as never,
      ) as ((props: Record<string, unknown>) => JSX.Element) & {
        displayName?: string;
      };

      StateComponent.displayName = `${name}.${stateName}`;

      return StateComponent;
    }

    if (createdDefaultState) {
      CreatedDefaultStateComponent = createStateComponent(
        'default',
        defaultRenderInput,
      );
    }

    for (const [stateName, input] of Object.entries(renderStates)) {
        if (stateName === 'default') {
          continue;
        }

        if (
          [
            '__proto__',
            'asComposable',
            'apply',
            'arguments',
            'bind',
            'call',
            'caller',
            'displayName',
            'length',
            'makeComposable',
            'name',
            'props',
            'prototype',
            'resource',
          ].includes(stateName)
        ) {
          throw new LayoutConfigurationError(
            `Render state name "${stateName}" is reserved`,
          );
        }

        stateComponents[stateName] = createStateComponent(stateName, input);
    }
    const includedComponentDefinitions = Object.fromEntries(
      Object.keys(includeLayoutProps ?? {}).flatMap((key) => {
        if (
          !allowsComponentPassthrough(includeLayoutProps?.[key]) ||
          !(key in mergedResolvedInProps)
        ) {
          return [];
        }

        const definition = mergedResolvedInProps[key] as AnyBuiltPropDefinition & {
          optional?: () => AnyBuiltPropDefinition;
        };
        const componentDefinition = isIncludedPropRequired(
          includeLayoutProps?.[key],
        )
          ? definition
          : definition.optional?.() ?? definition;

        return [[key, componentDefinition]];
      }),
    );
    const previewEnabled = !inheritedInspection && (getLayoutDebug(layoutOptions)?.preview ?? getLayoutDebug(options)?.preview ?? getLayoutDebug(layout)?.preview) === true;
    const previewTargets = { default: Component, ...stateComponents } as unknown as Record<string, (props: Record<string, unknown>) => JSX.Element>;
    let previewRoot: object;
    const previewOptions = {
      store: inspectionStore, layout: layoutId, states: stateIds, components: previewTargets,
      fixtures: () => (previewRoot as Record<symbol, Record<string, Record<string, unknown>>>)[layoutPreviewFixtures],
    };
    const exposedStates = previewEnabled ? Object.fromEntries(Object.entries(stateComponents).map(([key, component]) => [key,
      createPreviewComponent(component, { ...previewOptions, state: stateIds.get(key)! }),
    ])) : stateComponents;
    const createdComponent = Object.assign(previewEnabled ? createPreviewComponent(Component as never, {
      ...previewOptions, state: activeInspection.state,
    }) : Component, {
      displayName: name,
      props: undefined as unknown as Show<
        ResolveProps<CustomProps> &
          ResolvedIncludedComponentProps<
            MergedLayoutInProps<Resources, InProps, Composables>,
            IncludeProps
          >
      >,
      resource: undefined as unknown as Resource,
      ...createComposition({
        components: resolvedComposables as Composables | undefined,
        name,
      }),
      ...exposedStates,
      [definedResourceLayoutComponentSymbol]: true as const,
    });

    previewRoot = createdComponent;
    inspectionStore.attach(createdComponent);
    const rootComponent = attachComponentPropDefinitions(createdComponent, {
      ...customLayoutProps,
      ...includedComponentDefinitions,
    } as InPropsObject);

    if (namespace) {
      if (Object.prototype.hasOwnProperty.call(stateComponents, 'Root')) {
        throw new LayoutConfigurationError(
          'Render state name "Root" is reserved when namespace is true',
        );
      }
      return { Root: rootComponent, ...exposedStates };
    }
    return rootComponent;
  }) as unknown as CreateResourceLayoutFnImpl<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    Render extends Record<string, unknown> ? Render : {}
  >;
  const createTopLevelMakeComposable = () => {
    return (options: Record<string, unknown>) => {
      const layout = definedResourceLayout({ ...options, namespace: false } as never);

      if (
        !('makeComposable' in layout) ||
        typeof layout.makeComposable !== 'function'
      ) {
        throw new LayoutConfigurationError(
          'makeComposable requires composables to be defined in the layout',
        );
      }

      return (layout.makeComposable as () => unknown)();
    };
  };

  function getComponentPropDefinitions(resource: LayoutResourceKey<Resources>) {
    const componentName = 'ScopedResourceComponent';
    const rawResolvedOptions =
      typeof inProps === 'function'
        ? inProps({
            resource: resourcesEnum,
            name: createProp.string().literal(componentName),
          })
        : inProps;
    const { resolvedInProps } = splitLayoutInProps(
      rawResolvedOptions as Record<string, unknown>,
    );
    const renderStates = (
      typeof layout.render === 'function'
        ? { default: layout.render }
        : layout.render
    ) as Record<string, unknown>;
    const defaultState = getSynchronousRenderStateDefinition(
      renderStates.default,
      layout.props,
    );
    const stateReferences = createStateReferences(renderStates);
    const defaultComposables = layout.composables || defaultState?.composables
      ? (create: CreateLayoutComposable<LayoutResourceKey<Resources>>) => ({
          ...(layout.composables?.(create, stateReferences) ?? {}),
          ...defaultState?.composables?.(create as never, stateReferences),
        })
      : undefined;
    const resolvedComposables = defaultComposables
      ? resolveLayoutComposables(defaultComposables, {
          resource,
          name: componentName,
          capitalize,
        })
      : undefined;

    for (const {
      props: presetPropDefinitions,
    } of collectComposablePresetEntries(resolvedComposables)) {
      Object.assign(resolvedInProps, presetPropDefinitions);
    }

    return {
      ...resolvedInProps,
      ...mergeLayoutProps(layout.props, defaultState?.props)?.custom,
    };
  }

  const { createLayoutForResourceBuilder, forResource } = createForResource<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >({
    createResourceLayout: definedResourceLayout as never,
    resolveLayoutOptionDefaults,
  });
  const forResources = createForResources<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >({
    createLayoutForResource: createLayoutForResourceBuilder,
    ...(layout.composables
      ? { createMakeComposableLayout: createTopLevelMakeComposable }
      : {}),
    createResourceLayout: definedResourceLayout as never,
    getComponentPropDefinitions,
  });

  const createResourceLayoutExtras: {
    forResource: CreateLayoutForResource<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      CustomProps
    >;
    forResources: CreateResourceLayoutForResourcesFn<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      CustomProps
    >;
    makeComposable?: ReturnType<typeof createTopLevelMakeComposable>;
  } = {
    forResource,
    forResources,
  };

  if (layout.composables) {
    createResourceLayoutExtras.makeComposable = createTopLevelMakeComposable();
  }

  const createResourceLayout = Object.assign(
    definedResourceLayout,
    createResourceLayoutExtras,
  ) as CreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    Render extends Record<string, unknown> ? Render : {}
  >;

  const createResourceLinks = createResourceLinksFn(resources);

  return (inspection?.store.attach ?? ((value: object) => value))({
    createResourceConfig,
    createResourceLayout,
    createResourceLinks,
    resources: resourcesAccessor,
    ResourceProvider,
    useResource,
  }) as DefinedResourceLayout<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    Render extends Record<string, unknown> ? Render : {}
  >;
}

type NonEmptyResourceDefinitions = readonly [
  ResourceDefinition,
  ...ResourceDefinition[],
];

/**
 * Factory returned by {@link DefineResourceLayout.forResources}.
 */
export type DefineResourceLayoutForResourcesFactory<
  BaseResources extends NonEmptyResourceDefinitions,
> = {
  <
    const Render extends { default: unknown } & Record<string, unknown>,
    const ExtraResources extends ReadonlyArray<ResourceDefinition> = [],
    Options extends InPropsDefinition<[...BaseResources, ...ExtraResources]> = {},
    Composables extends ComposableComponents = {},
    Namespace extends boolean = false,
  >(
    options: Omit<
      CreateViewMapRenderStatesOptions<[...BaseResources, ...ExtraResources], Options, Composables, {}, {}, Render, Namespace>,
      'resources'
    > & { resources?: AssertUnreservedResources<ExtraResources> },
  ): DefinedResourceLayoutFromStates<[...BaseResources, ...ExtraResources], Options, Composables, Render, Namespace>;
  <
    const ExtraResources extends ReadonlyArray<ResourceDefinition> = [],
    Options extends InPropsDefinition<[...BaseResources, ...ExtraResources]> = {},
    Composables extends ComposableComponents = {},
    const IncludeProps extends LayoutIncludeProps<[...BaseResources, ...ExtraResources], Options, Composables> = {},
    CustomProps extends InPropsObject = {},
    Namespace extends boolean = false,
  >(
    options: Omit<
      CreateViewMapFunctionRenderOptions<[...BaseResources, ...ExtraResources], Options, Composables, IncludeProps, CustomProps, Namespace>,
      'resources'
    > & { resources?: AssertUnreservedResources<ExtraResources> },
  ): DefinedResourceLayout<[...BaseResources, ...ExtraResources], Options, Composables, IncludeProps, CustomProps, {}, Namespace>;
};

/**
 * Binds one or more resources, then accepts the remaining
 * {@link defineResourceLayout} options (with optional extra `resources`).
 */
export type DefineResourceLayoutForResources = <
  const Resources extends NonEmptyResourceDefinitions,
>(
  ...resources: Resources
) => DefineResourceLayoutForResourcesFactory<Resources>;

type IntersectStates<Union> =
  (Union extends unknown ? (value: Union) => void : never) extends
    (value: infer Intersection) => void ? Intersection : {};

type AllStateComposables<States> = IntersectStates<{
  [State in keyof States]: RenderStateComposables<UnwrapRenderState<States[State]>>;
}[keyof States]> extends infer Components extends ComposableComponents
  ? Components
  : {};

type UnionKeys<U> = U extends unknown ? keyof U : never;
type UnionValue<U, K extends PropertyKey> = U extends unknown ? K extends keyof U ? U[K] : never : never;
type CombinedInclude<Value> = [Extract<Value, true | { visibility: 'required'; passthrough: 'config' }>] extends [never]
  ? 'optional' extends Value ? 'optional'
    : [Extract<Value, { visibility: 'optional' }>] extends [never] ? Value : 'optional'
  : true;
type AllStateIncludes<States, Union = {
  [State in keyof States]: RenderStateIncludeProps<States[State]>;
}[keyof States]> = { [K in UnionKeys<Union>]: CombinedInclude<UnionValue<Union, K>> };

export type MergeContract<Base, Local> = Omit<Base, keyof Local> & Local;
type PlainStateWithDefaults<Input, Include, Custom extends InPropsObject> =
  UnwrapRenderState<Input> & { props: {
    include: MergeContract<Include, RenderStateIncludeProps<Input>>;
    custom: MergeContract<Custom, RenderStateCustomProps<Input>>;
  } };
type StateWithDefaults<Input, Include, Custom extends InPropsObject> =
  Input extends import('./render-state').DeferredRenderState<infer D extends AnyRenderStateDefinition> ? import('./render-state').DeferredRenderState<PlainStateWithDefaults<D, Include, Custom>> :
  Input extends import('./render-state').LazyRenderState<infer D extends AnyRenderStateDefinition> ? import('./render-state').LazyRenderState<PlainStateWithDefaults<D, Include, Custom>> :
  PlainStateWithDefaults<Input, Include, Custom>;
type StatesWithDefaults<States, Include, Custom extends InPropsObject> = {
  [K in keyof States]: StateWithDefaults<States[K], Include, Custom>;
};
export type DefinedResourceLayoutFromStates<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Render extends { default: unknown },
  DefaultNamespace extends boolean = false,
  BaseInclude extends LayoutIncludeProps<Resources, Options, Composables> = {},
  BaseCustom extends InPropsObject = {},
  Naming extends LayoutNameInput<any, any> | undefined = undefined,
> = DefinedResourceLayout<
  Resources,
  Options,
  Composables & AllStateComposables<Render>,
  AllStateIncludes<StatesWithDefaults<Render, BaseInclude, BaseCustom>> extends infer Include extends LayoutIncludeProps<Resources, Options, Composables & AllStateComposables<Render>> ? Include : {},
  MergeContract<BaseCustom, RenderStateCustomProps<Render['default']>>,
  StatesWithDefaults<Render, BaseInclude, BaseCustom>,
  DefaultNamespace,
  Naming
>;

/** Defines either a render-state map or a single render callback. */
export type DefineResourceLayoutFn = {
  // State maps come first so empty objects receive state-key completions.
  <
    const Resources extends ReadonlyArray<ResourceDefinition>,
    const Render extends { default: unknown } & Record<string, unknown>,
    Options extends InPropsDefinition<Resources> = {},
    Composables extends ComposableComponents = {},
    Namespace extends boolean = false,
    const IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
    CustomProps extends InPropsObject = {},
    const Naming extends LayoutNameInput<LayoutResourceKey<Resources>> | undefined = undefined,
  >(
    options: Omit<CreateViewMapRenderStatesOptions<Resources, Options, Composables, IncludeProps, CustomProps, Render, Namespace>, 'name'> & { name?: Naming },
  ): DefinedResourceLayoutFromStates<Resources, Options, Composables, Render, Namespace, IncludeProps, CustomProps, Naming>;
  <
    const Resources extends ReadonlyArray<ResourceDefinition>,
    InProps extends InPropsDefinition<Resources> = {},
    Composables extends ComposableComponents = {},
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      InProps,
      Composables
    > = {},
    CustomProps extends InPropsObject = {},
    Namespace extends boolean = false,
    const Naming extends LayoutNameInput<LayoutResourceKey<Resources>> | undefined = undefined,
  >(
    options: Omit<CreateViewMapFunctionRenderOptions<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      CustomProps,
      Namespace
    >, 'name'> & { name?: Naming },
  ): DefinedResourceLayout<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    {},
    Namespace,
    Naming
  >;
};

/**
 * Captures a `resources` array with its literal tuple type intact, so it can be
 * declared separately from the `defineResourceLayout` call without needing an
 * `as const` assertion.
 */
export type DefineResourcesFn = <
  const Resources extends ReadonlyArray<ResourceDefinition>,
>(
  ...resources: Resources
) => Resources;

function defineResources<
  const Resources extends ReadonlyArray<ResourceDefinition>,
>(...resources: Resources): Resources {
  return resources;
}

export type DefineResourceLayout = DefineResourceLayoutFn & {
  forResources: DefineResourceLayoutForResources;
  /**
   * Builds a strongly-typed `resources` array to pass to `defineResourceLayout`
   * (or `defineResourceLayout.forResources`) without an `as const` assertion.
   */
  defineResources: DefineResourcesFn;
  /**
   * Like {@link defineResourceLayout}, but also returns a `Shell` component.
   *
   * With plain `defineResourceLayout`, every page is wrapped in its own
   * `createResourceLayout` component, so navigating between resources unmounts
   * one page component and mounts another — the shared chrome the `render`
   * produces (a sidebar, a header, subscriptions, observers) is rebuilt every
   * time. `withLayout` splits that chrome into a `shell` that mounts once,
   * above the router outlet, and stays mounted across navigation; pages mount
   * and unmount inside it and report their resource up automatically.
   */
  withLayout: DefineResourceLayoutWithLayoutFn;
};

function defineResourceLayoutForResources<
  const Resources extends NonEmptyResourceDefinitions,
>(
  ...baseResources: Resources
): DefineResourceLayoutForResourcesFactory<Resources> {
  return ((options: Omit<CreateViewMapOptions<Resources>, 'resources'> & {
    resources?: ReadonlyArray<ResourceDefinition>;
  }) => {
    const { resources: extraResources, ...rest } = options;
    const resources = extraResources
      ? [...baseResources, ...extraResources]
      : [...baseResources];

    return defineResourceLayoutImpl({
      ...rest,
      resources,
    } as never);
  }) as unknown as DefineResourceLayoutForResourcesFactory<Resources>;
}

/* -------------------------------------------------------------------------- */
/*  defineResourceLayout.withLayout — a once-mounted application shell        */
/* -------------------------------------------------------------------------- */

/**
 * Render context passed as the second argument to
 * {@link ShellLayoutDefinition.render}.
 *
 * The same shape as a per-resource `render` context (`composables`,
 * `resources`, `name`, `inProps`), with two differences that follow from the
 * shell being mounted once above the router outlet rather than per page:
 *
 * - `resource` / `resources.current` are `LayoutResourceKey | undefined`. The
 *   shell outlives any single page, so the current resource is whatever the
 *   mounted page last reported (or the `resource` prop, or nothing yet).
 * - `children` is the shell's content region. Render it where page content
 *   belongs; it is already wrapped so mounted pages report their resource back.
 */
export type ShellRenderContext<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ShellComposables extends ComposableComponents,
> = {
  composables: LayoutRenderComposables<ShellComposables>;
  inProps: Record<string, unknown>;
  /**
   * The resource currently rendered in the outlet, or `undefined` when no
   * per-resource page is mounted and no `resource` prop was passed.
   */
  resource: LayoutResourceKey<Resources> | undefined;
  /**
   * Resources accessor for this definition. `current` follows `resource` above
   * and may be `undefined`.
   */
  resources: LayoutResourcesAccessor<Resources> & {
    readonly current: LayoutResourceKey<Resources> | undefined;
  };
  name: string;
  /**
   * The shell's content region — typically a router `<Outlet />`. Render it
   * where page content belongs.
   */
  children: ReactNode;
};

/**
 * The `shell` block of a {@link defineResourceLayout.withLayout} call: the
 * chrome that mounts once and stays mounted while pages navigate inside it.
 *
 * Mirrors {@link LayoutDefinition} (`props`, `composables`, `render`) so the
 * two blocks read the same, plus an optional `name`.
 */
export type ShellLayoutDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  ShellComposables extends ComposableComponents,
  ShellIncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    ShellComposables
  >,
  ShellCustomProps extends InPropsObject,
> = {
  /**
   * Stable name for the shell component (React DevTools) and the base for any
   * resource-scoped composable names. Defaults to `'ResourceLayoutShell'`.
   */
  name?: string;
  props?: LayoutProps<
    Resources,
    Options,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps
  >;
  composables?: (
    create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
  ) => ShellComposables;
  render: (
    props: LayoutRenderProps<
      Resources,
      Options,
      ShellComposables,
      ShellIncludeProps,
      ShellCustomProps
    >,
    context: ShellRenderContext<Resources, ShellComposables>,
  ) => JSX.Element;
};

/**
 * Props accepted by the `Shell` component from
 * {@link defineResourceLayout.withLayout}.
 */
export type ResourceLayoutShellProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  ShellComposables extends ComposableComponents,
  ShellIncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    ShellComposables
  >,
  ShellCustomProps extends InPropsObject,
> = Show<
  ResolveProps<ShellCustomProps> &
    ResolvedIncludedComponentProps<
      MergedLayoutInProps<Resources, Options, ShellComposables>,
      ShellIncludeProps
    > & {
      /**
       * The resource the shell renders for. Overrides the value reported by the
       * page mounted in `children`. Always available — pass it from tests,
       * stories, or a route that renders non-library content but still wants
       * the shell.
       */
      resource?: LayoutResourceKey<Resources>;
      /** The shell's content region — typically a router `<Outlet />`. */
      children: ReactNode;
    }
>;

/**
 * The once-mounted application shell returned from
 * {@link defineResourceLayout.withLayout}. Wrap the router outlet with it.
 */
export type ResourceLayoutShellComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  ShellComposables extends ComposableComponents = {},
  ShellIncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    ShellComposables
  > = {},
  ShellCustomProps extends InPropsObject = {},
> = BaseComponent<
  string,
  ResourceLayoutShellProps<
    Resources,
    Options,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps
  >
> & {
  (
    props: ResourceLayoutShellProps<
      Resources,
      Options,
      ShellComposables,
      ShellIncludeProps,
      ShellCustomProps
    >,
  ): JSX.Element;
};

/**
 * Options for {@link defineResourceLayout.withLayout}: everything
 * {@link defineResourceLayout} accepts, plus a required `shell`, and with the
 * per-resource `layout.render` made optional.
 */
export type CreateResourceLayoutWithLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
  ShellComposables extends ComposableComponents = {},
  ShellIncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    ShellComposables
  > = {},
  ShellCustomProps extends InPropsObject = {},
  Render = LayoutRenderFunction<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >,
  Namespace extends boolean = false,
> = {
  /** Default namespace mode for created layouts. Defaults to false. */
  namespace?: Namespace;
  /**
   * An array of valid resource names to support. Nested sub-resource slugs that
   * collide with config keys (`component`, `detail`, `new`, …) are reserved.
   */
  resources: AssertUnreservedResources<Resources>;
  /**
   * The options that are passed into the created resource layout. Shared by the
   * shell and the per-resource layout, so an `include` on either side can draw
   * from the same definitions.
   */
  options?: Options;
  /**
   * The once-mounted shell. The returned `Shell` wraps the router outlet and
   * stays mounted across resource navigation, so its composables (a persistent
   * sidebar, header, breadcrumb container, …) keep their state and DOM while
   * pages mount and unmount inside it.
   */
  shell: ShellLayoutDefinition<
    Resources,
    Options,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps
  >;
  /**
   * Per-resource content. Optional here: when the shell renders the whole
   * chrome, a page is just a slot — omit `render` and the generated component
   * renders its own `children` into the shell's outlet. Provide it to give a
   * resource its own header, actions, or per-page structure.
   */
  layout?: Omit<
    LayoutDefinition<Resources, Options, Composables, IncludeProps, CustomProps>,
    'render'
  > & {
    render?:
      | LayoutRenderFunction<
          Resources,
          Options,
          Composables,
          IncludeProps,
          CustomProps
        >
      | (Render extends (...args: any[]) => any
          ? never
          : Render & ContextualInlineRenderStates<Resources, Options, Composables>);
  };
};

/**
 * {@link DefinedResourceLayout} plus the once-mounted `Shell`.
 */
export type DefinedResourceLayoutWithShell<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
  ShellComposables extends ComposableComponents = {},
  ShellIncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    ShellComposables
  > = {},
  ShellCustomProps extends InPropsObject = {},
  States = {},
  DefaultNamespace extends boolean = false,
> = DefinedResourceLayout<
  Resources,
  Options,
  Composables,
  IncludeProps,
  CustomProps,
  States,
  DefaultNamespace
> & {
  /**
   * The application shell. Mount it once, wrapping the router outlet:
   *
   * ```tsx
   * function AdminRoute() {
   *   const resource = Route.useParams({ select: (p) => p.resource });
   *   return (
   *     <Shell resource={resource}>
   *       <Outlet />
   *     </Shell>
   *   );
   * }
   * ```
   *
   * Passing `resource` is optional: a page created by `createResourceLayout`
   * reports its own resource to the shell automatically. Pass it for routes
   * that render non-library content, or in tests and stories.
   */
  Shell: ResourceLayoutShellComponent<
    Resources,
    Options,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps
  >;
};

/**
 * Signature of {@link defineResourceLayout.withLayout}.
 */
// Preserve state-key completions while the caller is building an empty map.
export type DefineResourceLayoutWithLayoutFn = {
  <
    const Resources extends ReadonlyArray<ResourceDefinition>,
    const Render extends { default: unknown } & Record<string, unknown>,
    Options extends InPropsDefinition<Resources> = {},
    Composables extends ComposableComponents = {},
    ShellComposables extends ComposableComponents = {},
    const ShellIncludeProps extends LayoutIncludeProps<Resources, Options, ShellComposables> = {},
    ShellCustomProps extends InPropsObject = {},
    Namespace extends boolean = false,
  >(
    options: Omit<
      CreateResourceLayoutWithLayoutOptions<Resources, Options, Composables, {}, {}, ShellComposables, ShellIncludeProps, ShellCustomProps, LayoutRenderFunction<Resources, Options, Composables, {}, {}>, Namespace>,
      'layout'
    > & {
      layout: CreateViewMapRenderStatesOptions<Resources, Options, Composables, {}, {}, Render, Namespace>['layout'];
    },
  ): DefinedResourceLayoutFromStates<Resources, Options, Composables, Render, Namespace> & {
    Shell: ResourceLayoutShellComponent<Resources, Options, ShellComposables, ShellIncludeProps, ShellCustomProps>;
  };
  <
    const Resources extends ReadonlyArray<ResourceDefinition>,
    Options extends InPropsDefinition<Resources> = {},
    Composables extends ComposableComponents = {},
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables
    > = {},
    CustomProps extends InPropsObject = {},
    ShellComposables extends ComposableComponents = {},
    const ShellIncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      ShellComposables
    > = {},
    ShellCustomProps extends InPropsObject = {},
    Namespace extends boolean = false,
  >(
    options: CreateResourceLayoutWithLayoutOptions<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps,
      ShellComposables,
      ShellIncludeProps,
      ShellCustomProps,
      LayoutRenderFunction<Resources, Options, Composables, IncludeProps, CustomProps>,
      Namespace
    >,
  ): DefinedResourceLayoutWithShell<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps,
    {},
    Namespace
  >;
};

/**
 * Loose runtime shape of a `shell` block, used by the impl below.
 */
type ShellLayoutRuntime = {
  name?: string;
  composables?: (create: unknown) => ComposableComponents;
  props?: {
    include?: Record<string, unknown>;
    custom?: Record<string, unknown>;
  };
  render: (
    props: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => JSX.Element;
};

/**
 * Builds the `Shell` component. Kept beside {@link defineResourceLayoutImpl} so
 * it can reuse the same private prop-resolution helpers.
 *
 * Unlike a per-resource component, the shell re-reads the current resource on
 * every render (reported by the mounted page) so resource-scoped composable
 * *names* can update. Composable *component identities* are resolved once and
 * kept stable: React reconciles by element type, so recreating
 * `composables.Layout` each render would remount wrapWith targets, sidebar
 * state, and the outlet. Display names are synced onto those stable functions
 * when the resource changes.
 *
 * @param shellId - Identity of the owning `withLayout` definition. The shell
 *   only accepts resource reports tagged with this id, so a page or pane from a
 *   different definition rendered in the outlet cannot corrupt its state.
 */
function createResourceLayoutShellComponent(
  resources: ReadonlyArray<ResourceDefinition>,
  inProps:
    | InPropsObject
    | ((opts: Record<string, unknown>) => InPropsObject),
  shell: ShellLayoutRuntime,
  shellId: symbol,
) {
  const shellName = shell.name ?? 'ResourceLayoutShell';
  // `resources` is the wide `ResourceDefinition[]` here (not the const generic
  // that `defineResourceLayoutImpl` captures), so the normalize/enum types are
  // erased to keep TS from trying to instantiate them structurally. Only the
  // runtime key list matters — the shell validates against it, it does not
  // surface it in a public type.
  const resourceKeys = Object.keys(
    normalizeResources(resources as never) as Record<string, unknown>,
  );
  const resourcesEnum = createPrimitivePropBuilder('string').enum(
    resourceKeys as never,
  );

  // `options` may be a function of `{ resource, name }`. The shell has no single
  // resource, so — like the component path in `defineResourceLayoutImpl` — the
  // enum stands in for `resource` while resolving the definitions.
  const rawResolvedOptions =
    typeof inProps === 'function'
      ? inProps({
          resource: resourcesEnum,
          name: createProp.string().literal(shellName),
        })
      : inProps;
  const { resolvedInProps, splitInProps } = splitLayoutInProps(
    rawResolvedOptions as Record<string, unknown>,
  );

  const includeShellProps = shell.props?.include;
  const includeShellPropKeys = Object.keys(includeShellProps ?? {});
  const shellCustomDefinitions = {
    ...(shell.props?.custom ?? {}),
  } as Record<string, AnyBuiltPropDefinition>;

  function syncShellComposableDisplayNames(
    stable: ComposableComponents,
    resource: string,
  ) {
    if (!shell.composables) {
      return;
    }

    const named = resolveLayoutComposables(shell.composables as never, {
      resource,
      name: shellName,
      capitalize,
    } as never) as ComposableComponents;

    for (const [key, component] of Object.entries(named)) {
      const stableComponent = stable[key];

      if (
        typeof stableComponent === 'function' &&
        typeof component === 'function' &&
        'displayName' in component
      ) {
        (stableComponent as { displayName?: string }).displayName = (
          component as { displayName?: string }
        ).displayName;
      }
    }
  }

  function Shell(props: Record<string, unknown>) {
    const { children: outlet, resource: resourceProp } = props as {
      children: ReactNode;
      resource?: string;
    };

    // Which resource is currently in the outlet. A per-resource page reports its
    // own resource here on mount (see the layout effect in `Component`);
    // `undefined` between pages or on a route with no per-resource layout. An
    // explicit `resource` prop always wins.
    const [reportedResource, setReportedResource] = useState<
      string | undefined
    >(undefined);
    const publishResource = useCallback<ResourceLayoutShellPublisher>(
      (resource, ownerId) => {
        // Ignore reports from components that belong to a different
        // `defineResourceLayout` definition — they share this context but their
        // resource is unrelated to this shell.
        if (ownerId !== shellId) {
          return;
        }

        setReportedResource(resource);
      },
      [],
    );
    const resource = resourceProp ?? reportedResource;

    // The outlet subtree must not re-render when `reportedResource` changes —
    // only the shell chrome should. Memoising the wrapped element lets React
    // bail out of reconciling the page while, say, the breadcrumb label updates.
    const shellChildren = useMemo(
      () => (
        <ResourceLayoutShellPublisherContext.Provider value={publishResource}>
          {outlet}
        </ResourceLayoutShellPublisherContext.Provider>
      ),
      [outlet, publishResource],
    );

    // Resolve composables once so `<composables.Layout>` keeps a stable element
    // type across Shell re-renders (including the layout-effect resource report).
    // Re-resolving every render would allocate new component functions and React
    // would remount the whole chrome tree. Names still track the live resource
    // via {@link syncShellComposableDisplayNames}.
    const composablesRef = useRef<ComposableComponents | undefined>(undefined);
    if (shell.composables) {
      const nameContextResource = resource ?? '';

      if (!composablesRef.current) {
        composablesRef.current = resolveLayoutComposables(
          shell.composables as never,
          {
            resource: nameContextResource,
            name: shellName,
            capitalize,
          } as never,
        ) as ComposableComponents;
      } else {
        syncShellComposableDisplayNames(
          composablesRef.current,
          nameContextResource,
        );
      }
    }
    const resolvedComposables = composablesRef.current;
    const validationContext = {
      layoutName: shellName,
      resource: resource ?? '',
    };

    const mergedResolvedInProps = { ...resolvedInProps } as Record<
      string,
      unknown
    >;
    for (const {
      props: presetPropDefinitions,
    } of collectComposablePresetEntries(resolvedComposables)) {
      Object.assign(mergedResolvedInProps, presetPropDefinitions);
    }

    // Included props: definition-time defaults from `options`, overridden by
    // anything passed to `<Shell>` (component passthrough). Computed before
    // preset validation so config-passthrough includes can reuse the defaults.
    const includedPropDefinitions = pick(
      mergedResolvedInProps,
      includeShellPropKeys,
    ) as Record<string, unknown>;
    const includedPropValues = {
      ...resolvePropDefinitionValues(includedPropDefinitions),
    } as Record<string, unknown>;

    for (const key of includeShellPropKeys) {
      const definition = mergedResolvedInProps[key];
      const behavior = includeShellProps?.[key];
      const callSiteValue = allowsComponentPassthrough(behavior)
        ? readLayoutOptionValue(key, definition, props)
        : undefined;
      // Config passthrough has no create-time call on Shell; still honour
      // literal / split defaults from `options` when present.
      const configValue = allowsConfigPassthrough(behavior)
        ? readLayoutOptionValue(key, definition, {
            ...includedPropValues,
            ...splitInProps,
          })
        : undefined;
      const splitValue = key in splitInProps ? splitInProps[key] : undefined;
      const value = callSiteValue ?? configValue ?? splitValue;

      if (value !== undefined) {
        includedPropValues[key] = value;
      }
    }

    // Preset props: Shell has no create-time call. Component-passthrough values
    // come from `<Shell>` props; config-passthrough values only from definition
    // defaults. Required config includes without a default are omitted from
    // validation — they are not typed on Shell and cannot be supplied.
    const composablePresetProps = Object.fromEntries(
      collectComposablePresetEntries(resolvedComposables).map(
        ({ key, props: presetPropDefinitions }) => {
          const entries = Object.entries(presetPropDefinitions);
          const validatedDefinitions = Object.fromEntries(
            entries.filter(([propKey]) => {
              const behavior = includeShellProps?.[propKey];

              if (behavior === undefined) {
                return true;
              }

              if (allowsComponentPassthrough(behavior)) {
                return true;
              }

              if (allowsConfigPassthrough(behavior)) {
                return includedPropValues[propKey] !== undefined;
              }

              return false;
            }),
          );
          const values = Object.fromEntries(
            entries.flatMap(([propKey]) => {
              if (propKey in props) {
                return [[propKey, props[propKey]]];
              }

              if (includedPropValues[propKey] !== undefined) {
                return [[propKey, includedPropValues[propKey]]];
              }

              return [];
            }),
          );

          return [
            key,
            validateProps(
              validatedDefinitions as Record<string, AnyBuiltPropDefinition>,
              values,
              validationContext,
            ),
          ];
        },
      ),
    );

    const validatedCustomProps = validateProps(
      shellCustomDefinitions,
      props,
      validationContext,
    );

    const requiredIncludedDefinitions = Object.fromEntries(
      Object.entries(includedPropDefinitions).filter(([key]) => {
        const behavior = includeShellProps?.[key];

        if (!isIncludedPropRequired(behavior)) {
          return false;
        }

        // Component passthrough stays required on `<Shell>` (and is typed there).
        if (allowsComponentPassthrough(behavior)) {
          return true;
        }

        // Config passthrough: only require when a definition-time value exists.
        return includedPropValues[key] !== undefined;
      }),
    );
    const optionalIncludedDefinitions = Object.fromEntries(
      Object.entries(includedPropDefinitions).filter(
        ([key]) =>
          !isIncludedPropRequired(includeShellProps?.[key]) &&
          includedPropValues[key] !== undefined,
      ),
    );
    const validatedIncludedProps = validateProps(
      {
        ...requiredIncludedDefinitions,
        ...optionalIncludedDefinitions,
      } as Record<string, AnyBuiltPropDefinition>,
      includedPropValues,
      validationContext,
    );
    const renderIncludedProps = Object.fromEntries(
      includeShellPropKeys.flatMap((key) =>
        key in validatedIncludedProps
          ? [
              [
                toLayoutRenderPropKey(key, mergedResolvedInProps[key]),
                validatedIncludedProps[
                  key as keyof typeof validatedIncludedProps
                ],
              ],
            ]
          : [],
      ),
    );

    const renderProps = { ...validatedCustomProps, ...renderIncludedProps };
    const renderContext = {
      composables: resolvedComposables,
      resource,
      resources: createLayoutRenderResourcesAccessor(
        resources as ReadonlyArray<ResourceDefinition>,
        resource as never,
      ),
      name: shellName,
      inProps: splitInProps,
      children: shellChildren,
    };

    const rendered = shell.render(renderProps, renderContext);

    return resolvedComposables ? (
      <LayoutComposablePresetProvider value={composablePresetProps}>
        {rendered}
      </LayoutComposablePresetProvider>
    ) : (
      rendered
    );
  }

  return Object.assign(Shell, {
    displayName: shellName,
    props: undefined as never,
  });
}

/**
 * Implementation of {@link defineResourceLayout.withLayout}. Delegates the
 * config / links / `createResourceLayout` pieces to {@link defineResourceLayoutImpl}
 * and adds the {@link createResourceLayoutShellComponent | Shell}.
 */
function defineResourceLayoutWithLayoutImpl(
  options: Record<string, unknown>,
): Record<string, unknown> {
  const {
    shell,
    layout,
    resources,
    options: inProps,
  } = options as {
    shell: ShellLayoutRuntime;
    layout?: {
      composables?: unknown;
      props?: { include?: unknown; custom?: Record<string, unknown> };
      render?: (
        props: Record<string, unknown>,
        context: unknown,
      ) => JSX.Element;
    };
    resources: ReadonlyArray<ResourceDefinition>;
    options?:
      | InPropsObject
      | ((opts: Record<string, unknown>) => InPropsObject);
  };

  // The per-resource `render` is optional under `withLayout`. When omitted, the
  // page is a pure content slot: give it a `children` prop (so
  // `<UsersPage>{content}</UsersPage>` type-checks and works) and a render that
  // drops that content into the shell's outlet. An explicit `render` is passed
  // through untouched.
  const resolvedLayout = layout?.render
    ? layout
    : {
        ...layout,
        props: {
          ...layout?.props,
          custom: {
            children: createProp.component({ type: 'ReactNode' }).optional(),
            ...(layout?.props?.custom ?? {}),
          },
        },
        render: (pageProps: Record<string, unknown>) => (
          <>{(pageProps.children as ReactNode) ?? null}</>
        ),
      };

  // Ties the shell to the pages created by *its* `createResourceLayout`. Pages
  // from other definitions rendered in the outlet carry a different id (or
  // none) and are ignored by the shell's resource tracking.
  const shellId = Symbol('resourceLayoutShell');

  const base = defineResourceLayoutImpl({
    resources,
    options: inProps,
    layout: resolvedLayout,
    namespace: options.namespace,
    shellId,
  } as never) as Record<string, unknown>;

  const Shell = createResourceLayoutShellComponent(
    resources,
    (inProps ?? {}) as never,
    shell,
    shellId,
  );

  return { ...base, Shell };
}

export const defineResourceLayout: DefineResourceLayout = Object.assign(
  defineResourceLayoutImpl as DefineResourceLayoutFn,
  {
    forResources: defineResourceLayoutForResources,
    defineResources,
    withLayout:
      defineResourceLayoutWithLayoutImpl as unknown as DefineResourceLayoutWithLayoutFn,
  },
);
