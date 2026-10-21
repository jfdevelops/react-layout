import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from '../errors';
import type { InPropsDefinition, InPropsObject } from '../props';
import type { ResourceDefinition } from '../resource';
import {
  type CreateViewMapOptions,
  type CreateViewMapBuiltInRenderStatesOptions,
  type DefinedResourceLayout,
  defineResourceLayout,
  type LayoutDefinition,
  type LayoutIncludeProps,
  type TypedBuiltInRenderStates,
} from './define-layout';
import {
  createLazyResourceLayout,
  type LazyResourceLayoutOptions,
  type LazyResourceStates,
} from './lazy-resource-layout';
import {
  createLayoutBuildingBlocks,
  type CreateLayoutBuildingBlocks,
} from './render-state';

/** A resource tuple with at least one entry, preserving literal and nested paths. */
export type NonEmptyResources = readonly [
  ResourceDefinition,
  ...ResourceDefinition[],
];

/**
 * The portion of a resource-layout definition accepted after resources and
 * options have been bound by {@link createDefinedResourceLayout}.
 */
export type DefinedResourceLayoutInput<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends InPropsObject,
  Render,
> = Omit<
  CreateViewMapOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    Render
  >,
  'options' | 'resources'
>;

/**
 * A `defineResourceLayout` function bound to one resource tuple and option
 * definition. Callers only provide the layout; `.lazy` instead creates a
 * type-preserving proxy around a named module export.
 */
export type BoundDefineResourceLayout<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
> = {
  <
    Composables extends ComposableComponents = {},
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      Composables
    > = {},
    CustomProps extends InPropsObject = {},
    const Render extends (...arguments_: any[]) => JSX.Element = Extract<
      LayoutDefinition<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
      >['render'],
      (...arguments_: any[]) => JSX.Element
    >,
  >(
    definition: DefinedResourceLayoutInput<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps,
      Render
    >,
  ): DefinedResourceLayout<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    {}
  >;
  <
    Composables extends ComposableComponents = {},
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
    const RenderStates extends { default: unknown } & Record<
      string,
      unknown
    > = { default: unknown },
  >(
    definition: Omit<
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
        > &
          RenderStates
      >,
      'options' | 'resources'
    >,
  ): DefinedResourceLayout<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    RenderStates
  >;
  lazy<Module extends Record<string, unknown>>(
    options: LazyResourceLayoutOptions<Resources, Module>,
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>>;
};

/**
 * Registers shared loading and module-error components for lazy resource
 * layouts. Defaults must be registered before the first `.lazy` call.
 */
export type DefineLazyDefaults = (defaults: LazyResourceStates) => void;

/**
 * Binds option definitions to the complete builder. Those option keys then
 * become available to every render state's `props.include` declaration.
 */
export type DefineOptions<Resources extends NonEmptyResources> = <
  const Options extends InPropsDefinition<Resources>,
>(
  options: Options,
) => DefinedResourceLayoutBuilder<Resources, Options>;

/**
 * Self-contained helpers for defining one family of resource layouts across
 * multiple files while retaining its resource and option types.
 */
export type DefinedResourceLayoutBuilder<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
> = CreateLayoutBuildingBlocks<Resources, Options> & {
  defineLazyDefaults: DefineLazyDefaults;
  defineOptions: DefineOptions<Resources>;
  defineResourceLayout: BoundDefineResourceLayout<Resources, Options>;
  resources: Resources;
};

/** The initial builder returned before option definitions are bound. */
export type CreateDefinedResourceLayoutResult<
  Resources extends NonEmptyResources,
> = DefinedResourceLayoutBuilder<Resources, {}>;

type CreateBuilderArguments<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
> = {
  options: Options;
  resources: Resources;
};

function createBuilder<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
>(
  arguments_: CreateBuilderArguments<Resources, Options>,
): DefinedResourceLayoutBuilder<Resources, Options> {
  const { options, resources } = arguments_;
  const buildingBlocks = createLayoutBuildingBlocks({ options, resources });
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

  const boundDefineResourceLayout = ((definition: Record<string, unknown>) =>
    defineBoundLayout({
      ...definition,
      options,
    } as never)) as unknown as BoundDefineResourceLayout<Resources, Options>;

  boundDefineResourceLayout.lazy = <Module extends Record<string, unknown>>(
    lazyOptions: LazyResourceLayoutOptions<Resources, Module>,
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>> => {
    lazyLayoutCreated = true;

    return createLazyResourceLayout(lazyOptions, lazyDefaults);
  };

  function defineOptions<
    const DefinedOptions extends InPropsDefinition<Resources>,
  >(
    definedOptions: DefinedOptions,
  ): DefinedResourceLayoutBuilder<Resources, DefinedOptions> {
    return createBuilder({ options: definedOptions, resources });
  }

  return {
    ...buildingBlocks,
    defineLazyDefaults,
    defineOptions,
    defineResourceLayout: boundDefineResourceLayout,
    resources,
  };
}

/**
 * Binds a literal resource tuple once and returns reusable, type-linked layout
 * helpers. Chain `.defineOptions(options)` when states need to include shared
 * option props.
 *
 * @example
 * ```tsx
 * const { createRenderState, defineResourceLayout } =
 *   createDefinedResourceLayout('users').defineOptions({
 *     title: createProp.string(),
 *   });
 * ```
 */
export function createDefinedResourceLayout<
  const Resources extends NonEmptyResources,
>(...resources: Resources): CreateDefinedResourceLayoutResult<Resources> {
  return createBuilder({ options: {}, resources });
}
