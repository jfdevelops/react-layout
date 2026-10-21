import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from '../errors';
import type { InPropsDefinition, InPropsObject } from '../props';
import type {
  IncludedComponentPropDefinitions,
  MergedLayoutInProps,
} from '../props';
import type { ResourceDefinition } from '../resource';
import {
  type CreateViewMapBuiltInRenderStatesOptions,
  type CreateViewMapFunctionRenderOptions,
  type DefinedResourceLayout,
  defineResourceLayout,
  type LayoutIncludeProps,
  type LayoutResourcesAccessor,
  type TypedBuiltInRenderStates,
  createLayoutResourcesAccessor,
} from './define-layout';
import {
  createLazyResourceLayout,
  type LazyResourceLayoutOptions,
  type LazyResourceStates,
} from './lazy-resource-layout';
import {
  createRenderStateBuilder,
  type CreateRenderState,
  type LayoutComposablesDefinition,
} from './render-state';

/** A resource tuple with at least one entry, preserving literal and nested paths. */
export type NonEmptyResources = readonly [
  ResourceDefinition,
  ...ResourceDefinition[],
];

/** Configuration shared by every layout created from one defined-layout factory. */
export type CreateDefinedResourceLayoutOptions<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = {
  /** Resources supported by every layout created from this factory. */
  resources: Resources;
  /** Props that render states can opt into through `props.include`. */
  options?: Options;
  /** Layout-wide composables available to every render state. */
  composables?: LayoutComposablesDefinition<Resources, Composables>;
};

/** The flat layout definition accepted after shared configuration is bound. */
export type DefinedResourceLayoutInput<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  Render,
> = Omit<
  CreateViewMapFunctionRenderOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >['layout'],
  'composables' | 'render'
> & { render: Render };

/** A `defineResourceLayout` function with its shared configuration pre-bound. */
export type BoundDefineResourceLayout<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = {
  /** Defines a layout whose `render` value is a single default-state callback. */
  <
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables
    > = {},
    CustomProps extends InPropsObject = {},
  >(
    layout: Omit<
      CreateViewMapFunctionRenderOptions<
        Resources,
        Options,
        Composables,
        IncludeProps,
        CustomProps
      >['layout'],
      'composables'
    >,
  ): DefinedResourceLayout<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    {}
  >;
  /**
   * Defines a layout whose `render` map contains the required `default` state
   * and any built-in or custom compound component states.
   */
  <
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables
    > = {},
    CustomProps extends InPropsObject = {},
    DefaultComposables extends ComposableComponents = {},
    const DefaultIncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables & DefaultComposables
    > = {},
    DefaultCustomProps extends InPropsObject = {},
    LoadingComposables extends ComposableComponents = {},
    const LoadingIncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables & LoadingComposables
    > = {},
    LoadingCustomProps extends InPropsObject = {},
    ErrorComposables extends ComposableComponents = {},
    const ErrorIncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables & ErrorComposables
    > = {},
    ErrorCustomProps extends InPropsObject = {},
    NotFoundComposables extends ComposableComponents = {},
    const NotFoundIncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables & NotFoundComposables
    > = {},
    NotFoundCustomProps extends InPropsObject = {},
    const RenderStates extends { default: unknown } & Record<string, unknown> = {
      default: unknown;
    },
  >(
    layout: Omit<
      CreateViewMapBuiltInRenderStatesOptions<
        Resources,
        Options,
        Composables,
        IncludeProps,
        CustomProps,
        TypedBuiltInRenderStates<
          Resources,
          Options,
          Composables,
          DefaultComposables,
          DefaultIncludeProps,
          DefaultCustomProps,
          LoadingComposables,
          LoadingIncludeProps,
          LoadingCustomProps,
          ErrorComposables,
          ErrorIncludeProps,
          ErrorCustomProps,
          NotFoundComposables,
          NotFoundIncludeProps,
          NotFoundCustomProps
        > & RenderStates
      >['layout'],
      'composables'
    >,
  ): DefinedResourceLayout<
    Resources,
    Options,
    Composables &
      DefaultComposables &
      LoadingComposables &
      ErrorComposables &
      NotFoundComposables,
    DefaultIncludeProps &
      LoadingIncludeProps &
      ErrorIncludeProps &
      NotFoundIncludeProps,
    DefaultCustomProps &
      IncludedComponentPropDefinitions<
        MergedLayoutInProps<
          Resources,
          Options,
          Composables & DefaultComposables
        >,
        DefaultIncludeProps
      >,
    RenderStates
  >;
  /**
   * Creates a lazy proxy for the single library-defined component exported by
   * a resource module.
   *
   * @param options - Resource path and named-module import callback.
   */
  lazy<Module extends Record<string, unknown>>(
    options: LazyResourceLayoutOptions<Resources, Module>,
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>>;
};

/** Registers loading and module-error components used by lazy layouts. */
export type DefineLazyDefaults = {
  /**
   * Sets defaults once, before the factory creates its first lazy layout.
   *
   * @param defaults - Shared components for pending module loads and failures.
   */
  (defaults: LazyResourceStates): void;
};

/** Reusable helpers produced by {@link createDefinedResourceLayout}. */
export type CreateDefinedResourceLayoutResult<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = {
  /** Creates eager, deferred, or separately imported render-state fragments. */
  createRenderState: CreateRenderState<Resources, Options, Composables>;
  /** Sets the shared loading and module-error UI used by lazy layouts. */
  defineLazyDefaults: DefineLazyDefaults;
  /** Defines a layout using the resources, options, and composables already bound. */
  defineResourceLayout: BoundDefineResourceLayout<
    Resources,
    Options,
    Composables
  >;
  /** Reads, selects, or validates the resources bound to this factory. */
  resources: LayoutResourcesAccessor<Resources>;
};

/**
 * Creates type-linked layout helpers from one shared configuration. The returned
 * `defineResourceLayout` accepts the layout directly, while `createRenderState`
 * carries the same resource and option types across file boundaries.
 *
 * @param configuration - Resources and optional shared props/composables to
 * bind to every returned helper.
 * @returns Helpers that share the configuration's inferred literal types.
 *
 * @example
 * ```tsx
 * const { createRenderState, defineResourceLayout } =
 *   createDefinedResourceLayout({
 *     resources: ['users'],
 *     options: { title: createProp.string() },
 *   });
 *
 * const Loading = createRenderState({
 *   state: 'Loading',
 *   props: { include: { title: true } },
 *   render: ({ title }) => <p>Loading {title}</p>,
 * });
 *
 * export const usersLayout = defineResourceLayout({
 *   render: { default: () => <Users />, ...Loading },
 * });
 * ```
 */
export function createDefinedResourceLayout<
  const Resources extends NonEmptyResources,
  const Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
>(
  configuration: CreateDefinedResourceLayoutOptions<
    Resources,
    Options,
    Composables
  >,
): CreateDefinedResourceLayoutResult<Resources, Options, Composables> {
  const { resources, options = {} as Options, composables } = configuration;
  const defineBoundLayout = defineResourceLayout.forResources(...resources);
  let lazyDefaults: LazyResourceStates = {};
  let lazyDefaultsDefined = false;
  let lazyLayoutCreated = false;

  function defineLazyDefaults(defaults: LazyResourceStates): void {
    if (lazyDefaultsDefined) {
      throw new LayoutConfigurationError(
        'Lazy resource defaults can only be defined once.',
      );
    }

    if (lazyLayoutCreated) {
      throw new LayoutConfigurationError(
        'Lazy resource defaults must be defined before creating a lazy resource layout.',
      );
    }

    lazyDefaults = defaults;
    lazyDefaultsDefined = true;
  }

  const boundDefineResourceLayout = ((layout: Record<string, unknown>) =>
    defineBoundLayout({
      options,
      layout: { ...layout, composables },
    } as never)) as unknown as BoundDefineResourceLayout<
    Resources,
    Options,
    Composables
  >;

  boundDefineResourceLayout.lazy = <Module extends Record<string, unknown>>(
    lazyOptions: LazyResourceLayoutOptions<Resources, Module>,
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>> => {
    lazyLayoutCreated = true;
    return createLazyResourceLayout(lazyOptions, lazyDefaults);
  };

  return {
    createRenderState: createRenderStateBuilder({
      composables,
      options,
      resources,
    }),
    defineLazyDefaults,
    defineResourceLayout: boundDefineResourceLayout,
    resources: createLayoutResourcesAccessor(resources),
  };
}
