import type { JSX } from 'react';
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
  resolveComposablePresetProps,
  resolveLayoutComposables,
} from '@jfdevelops/react-layout-composables';
import {
  type AnyBuiltPropDefinition,
  createPrimitivePropBuilder,
  createProp,
  type ResolveLayoutProps,
  type ResolveProps,
  resolvePropDefinitionValues,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import {
  IncludedProps,
  InferredInProps,
  InPropsDefinition,
  InPropsObject,
  LayoutRenderProps,
  MergedLayoutInProps,
} from '../props';
import {
  normalizeResources,
  toResourceEnum,
  type LayoutResourceKey,
  type ResourceDefinition,
} from '../resource';
import { BaseComponent, functionalUpdate, pick, Show, Updater } from '../utils';
import { capitalize } from '../utils/capitalize';
import {
  type CreateResourceConfigFn,
  createResourceConfig,
} from './get-component';
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

export type LayoutIncludeProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = IncludedProps<MergedLayoutInProps<Resources, Options, Composables>>;

type LayoutProps<
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
  resource: LayoutResourceKey<Resources>;
  name: string;
};
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

type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * An array of valid resource names to support.
   */
  resources: Resources;
  /**
   * The options that are passed into the created resource layout.
   */
  options: Options;
  layout: {
    /**
     * The props to pass to the layout.
     */
    props?: LayoutProps<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >;
    /**
     * Components used to compose the layout. Invoked per layout instance with
     * a scoped `create` that resolves composable `name` callbacks using the
     * layout's `resource` and `name`.
     */
    composables?: (
      create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
    ) => Composables;
    /**
     * The render function for the layout.
     */
    render: (
      props: LayoutRenderProps<
        Resources,
        Options,
        Composables,
        IncludeProps,
        CustomProps
      >,
      context: LayoutRenderContext<Resources, Composables>,
    ) => JSX.Element;
  };
};

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
> = ResourceLayoutComposition<Name, Composables> &
  BaseComponent<Name, ResolveProps<Props>> & {
    (props: Show<ResolveProps<Props>>): JSX.Element;
  };

export type LayoutPropsForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
> = ResolveLayoutProps<InferredInProps<Resources, InProps>> &
  RequiredPresetLayoutProps<Composables>;

type CreateResourceLayoutFnImpl<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
> = <
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
>(
  options: CreateResourceLayoutOptions<
    Resources,
    InProps,
    Composables,
    Name,
    Resource,
    Props
  >,
) => ResourceLayoutComponent<Name, CustomProps, Composables>;

export type CreateResourceLayoutMakeComposableOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
> = CreateResourceLayoutOptionsBase<Resources, Name, Resource, Props> &
  Partial<LayoutPropsForResource<Resources, InProps, Composables>>;

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
    Props
  >,
) => ComposableResourceLayout<Composables, Name, any, any, any>;

type CreateResourceLayoutFnBase<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
> = CreateResourceLayoutFnImpl<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps
> & {
  /**
   * A function to create a resource layout for a specific resource.
   */
  forResource: CreateLayoutForResource<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
  /**
   * Creates resource layout factories for multiple defined resources.
   */
  forResources: CreateResourceLayoutForResourcesFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
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
> = CreateResourceLayoutFnBase<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps
> &
  CreateResourceLayoutMakeComposableMember<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;

type DefinedResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  createResourceConfig: CreateResourceConfigFn<Resources>;
  createResourceLayout: CreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
  createResourceLinks: CreateResourceLinksFn<Resources>;
};

export function defineResourceLayout<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  const IncludeProps extends LayoutIncludeProps<
    Resources,
    InProps,
    Composables
  > = {},
  CustomProps extends InPropsObject = {},
>(
  options: CreateViewMapOptions<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >,
) {
  const { options: inProps, resources, layout } = options;
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
      Name,
      Resource,
      Props
    >,
  ) => {
    const {
      name,
      props: instancePropDefinitions,
      ...layoutOptionProps
    } = layoutOptions;
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
    const { composables, render, props: layoutProps } = layout;
    const customLayoutProps = layoutProps?.custom;
    const includeLayoutProps = layoutProps?.include;
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
    const resolvedComposables = composables
      ? resolveLayoutComposables(composables, layoutContext)
      : undefined;
    const mergedResolvedInProps = { ...resolvedInProps };

    for (const {
      props: presetPropDefinitions,
    } of collectComposablePresetEntries(resolvedComposables)) {
      Object.assign(mergedResolvedInProps, presetPropDefinitions);
    }

    const composablePresetProps = resolveComposablePresetProps(
      resolvedComposables,
      layoutOptionProps as Record<string, unknown>,
    );
    const mergedRenderContext = {
      composables: resolvedComposables as LayoutRenderComposables<Composables>,
      resource: layoutContext.resource,
      name: layoutContext.name,
      inProps: splitInProps,
    } as LayoutRenderContext<Resources, Composables>;

    function Component(props: Show<ResolveProps<CustomProps>>) {
      const validatedProps = validateProps(resolvedLayoutProps, props);
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
        const layoutOptionValue = readLayoutOptionValue(
          key,
          definition,
          layoutOptionProps,
        );
        const splitValue = key in splitInProps ? splitInProps[key] : undefined;
        const value = layoutOptionValue ?? splitValue;

        if (value !== undefined) {
          includedPropValues[key] = value;
        }
      }

      const validatedIncludedProps = validateProps(
        includedPropDefinitions as Record<string, AnyBuiltPropDefinition>,
        includedPropValues,
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

      return (
        <LayoutComposablePresetProvider value={composablePresetProps}>
          {render(layoutRenderProps, mergedRenderContext)}
        </LayoutComposablePresetProvider>
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

    return Object.assign(Component, {
      displayName: name,
      props: undefined as unknown as ResolveProps<CustomProps>,
      ...createComposition({
        components: resolvedComposables as Composables | undefined,
        name,
      }),
    });
  }) as CreateResourceLayoutFnImpl<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
  const createTopLevelMakeComposable = () => {
    return (options: Record<string, unknown>) => {
      const layout = definedResourceLayout(options as never);

      if (
        !('makeComposable' in layout) ||
        typeof layout.makeComposable !== 'function'
      ) {
        throw new Error(
          'makeComposable requires composables to be defined in the layout',
        );
      }

      return layout.makeComposable();
    };
  };

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
    CustomProps
  >;

  const createResourceLinks = createResourceLinksFn(resources);

  return {
    createResourceConfig,
    createResourceLayout,
    createResourceLinks,
  } as DefinedResourceLayout<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
}
