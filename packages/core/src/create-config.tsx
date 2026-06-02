import type { JSX } from 'react';
import {
  type ComposableComponents,
  type ComposableNameContext,
  type CreateLayoutComposable,
  MakeComposable,
  makeComposable,
  MakeComposableOptions,
  resolveLayoutComposables,
} from './composable';
import {
  type AnyBuiltPropDefinition,
  createPrimitivePropBuilder,
  createProp,
  type ResolveLayoutProps,
  type ResolveProps,
  validateProps,
} from './validators';
import {
  IncludedProps,
  InferredInProps,
  InPropsDefinition,
  InPropsObject,
  LayoutRenderProps,
} from './props';
import {
  normalizeResources,
  toResourceEnum,
  type LayoutResourceKey,
  type NormalizeResources,
  type ResourceDefinition,
} from './resource';
import {
  BaseComponent,
  pick,
  resolvePropDefinitionValues,
  Show,
} from './utils';
import { capitalize } from './utils/capitalize';

type LayoutProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, Options>> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * Props to include in the layout.
   */
  include?: IncludeProps;
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

type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, Options>> = {},
  CustomProps extends InPropsObject = {},
  Composables extends ComposableComponents = {},
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
    props?: LayoutProps<Resources, Options, IncludeProps, CustomProps>;
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
      props: LayoutRenderProps<Resources, Options, IncludeProps, CustomProps>,
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
type ResourceLayoutComponent<
  Name extends string,
  Props extends InPropsObject = {},
  Composables extends ComposableComponents = {},
> = ResourceLayoutComposition<Name, Composables> &
  BaseComponent<Name, ResolveProps<Props>> & {
    (props: Show<ResolveProps<Props>>): JSX.Element;
  };

type DefinedResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
> = ResolveLayoutProps<InferredInProps<Resources, InProps>> & {
  name: Name;
  resource: Resource;
  props?: Props;
};
type DefinedResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, InProps>> = {},
  CustomProps extends InPropsObject = {},
  Composables extends ComposableComponents = {},
> = <
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
>(
  options: DefinedResourceLayoutOptions<
    Resources,
    InProps,
    Name,
    Resource,
    Props
  >,
) => ResourceLayoutComponent<Name, CustomProps, Composables>;

export function defineResourceLayout<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  IncludeProps extends IncludedProps<InferredInProps<Resources, InProps>> = {},
  CustomProps extends InPropsObject = {},
  Composables extends ComposableComponents = {},
>(
  options: CreateViewMapOptions<
    Resources,
    InProps,
    IncludeProps,
    CustomProps,
    Composables
  >,
) {
  const { options: inProps, resources, layout } = options;
  const normalizedResources = normalizeResources(resources);
  const resourcesEnum = createPrimitivePropBuilder('string').enum(
    toResourceEnum(normalizedResources),
  );
  const definedResourceLayout: DefinedResourceLayout<
    Resources,
    InProps,
    IncludeProps,
    CustomProps,
    Composables
  > = (layoutOptions) => {
    const {
      name,
      props: instancePropDefinitions,
      ...layoutOptionProps
    } = layoutOptions;
    const createComposableLayout =
      makeComposable<
        LayoutRenderProps<Resources, InProps, IncludeProps, CustomProps>
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
    const resolvedIncludedProps = pick(
      resolvedInProps,
      Object.keys(includeLayoutProps ?? {}),
    );
    const resolvedLayoutProps = {
      ...resolvedIncludedProps,
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
        resolvedInProps,
        includedPropKeys,
      ) as Record<string, unknown>;
      const includedPropValues = {
        ...resolvePropDefinitionValues(includedPropDefinitions),
        ...pick(
          splitInProps,
          includedPropKeys as (keyof typeof splitInProps)[],
        ),
        ...pick(
          layoutOptionProps,
          includedPropKeys as (keyof typeof layoutOptionProps)[],
        ),
      };
      const validatedIncludedProps = validateProps(
        includedPropDefinitions as Record<string, AnyBuiltPropDefinition>,
        includedPropValues,
      );
      const layoutRenderProps = {
        ...validatedProps,
        ...validatedIncludedProps,
      } as unknown as LayoutRenderProps<
        Resources,
        InProps,
        IncludeProps,
        CustomProps
      >;

      return <>{render(layoutRenderProps, mergedRenderContext)}</>;
    }

    function createComposition<LayoutName extends string>(
      compositionOptions: MakeComposableOptions<Composables, LayoutName>,
    ) {
      if (!compositionOptions.components) {
        return {} as ResourceLayoutComposition<LayoutName, Composables>;
      }

      return {
        makeComposable: createComposableLayout(compositionOptions),
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
  };

  return definedResourceLayout;
}
