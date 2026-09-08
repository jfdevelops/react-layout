import {
  type JSX,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
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
  normalizeResources,
  toResourceEnum,
  type LayoutResourceKey,
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
   * for the resource this instance renders, call `resources()` for the raw
   * value, use `resources.pick(...)` / `resources.omit(...)` to filter, or
   * `resources.isResource(...)` to narrow an unknown value.
   */
  resources: LayoutRenderResourcesAccessor<Resources>;
  name: string;
};

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
 * - `resources()` returns the raw resources.
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
   * Returns the raw `resources` value passed to `defineResourceLayout`,
   * exactly as declared.
   */
  (): Resources;
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

function createLayoutResourcesAccessor<
  Resources extends ReadonlyArray<ResourceDefinition>,
>(resources: Resources): LayoutResourcesAccessor<Resources> {
  const accessor = (() => resources) as LayoutResourcesAccessor<Resources>;

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
type LayoutDefinition<
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

type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * An array of valid resource names to support. Nested sub-resource slugs that
   * collide with config keys (`component`, `detail`, `new`, …) are reserved.
   */
  resources: AssertUnreservedResources<Resources>;
  /**
   * The options that are passed into the created resource layout.
   */
  options?: Options;
  layout: LayoutDefinition<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >;
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
  Resource extends string = string,
  IncludedCallProps extends object = {},
> = ResourceLayoutComposition<Name, Composables> &
  BaseComponent<Name, Show<ResolveProps<Props> & IncludedCallProps>> & {
    (props: Show<ResolveProps<Props> & IncludedCallProps>): JSX.Element;
    /**
     * A type-only property containing the resource associated with this
     * component. This property is `undefined` at runtime.
     */
    readonly resource: Resource;
  };

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
    IncludeProps,
    Name,
    Resource,
    Props
  >,
) => ResourceLayoutComponent<
  Name,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    IncludeProps
  >
>;

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
  /**
   * Accessor for the resources bound to this definition. Call `resources()` for
   * the raw value, or `resources.pick(...)` / `resources.omit(...)` to filter.
   */
  resources: LayoutResourcesAccessor<Resources>;
};

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
>(
  options: CreateViewMapOptions<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >,
): DefinedResourceLayout<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps
> {
  const { options: inProps = {} as InProps, resources, layout } = options;
  // Internal, set only by `defineResourceLayout.withLayout`: the identity of the
  // owning definition, forwarded when a page reports its resource so the shell
  // can tell its own pages apart from ones belonging to another definition.
  const shellId = (options as { shellId?: symbol }).shellId;

  assertUnreservedResourceSlugs(resources);

  const resourcesAccessor = createLayoutResourcesAccessor(resources);
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
    const resolvedComposables = composables
      ? resolveLayoutComposables(composables, layoutContext)
      : undefined;
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
    const resolvedComposables = layout.composables
      ? resolveLayoutComposables(layout.composables, {
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
      ...layout.props?.custom,
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
    CustomProps
  >;

  const createResourceLinks = createResourceLinksFn(resources);

  return {
    createResourceConfig,
    createResourceLayout,
    createResourceLinks,
    resources: resourcesAccessor,
  } as DefinedResourceLayout<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
}

type DefineResourceLayoutForResourcesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
  ExtraResources extends ReadonlyArray<ResourceDefinition> = [],
> = Omit<
  CreateViewMapOptions<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >,
  'resources'
> & {
  /**
   * Additional resources to merge with those bound by
   * {@link defineResourceLayout.forResources}.
   */
  resources?: AssertUnreservedResources<ExtraResources>;
};

type NonEmptyResourceDefinitions = readonly [
  ResourceDefinition,
  ...ResourceDefinition[],
];

/**
 * Factory returned by {@link DefineResourceLayout.forResources}.
 */
export type DefineResourceLayoutForResourcesFactory<
  BaseResources extends NonEmptyResourceDefinitions,
> = <
  const ExtraResources extends ReadonlyArray<ResourceDefinition> = [],
  InProps extends InPropsDefinition<[...BaseResources, ...ExtraResources]> = {},
  Composables extends ComposableComponents = {},
  const IncludeProps extends LayoutIncludeProps<
    [...BaseResources, ...ExtraResources],
    InProps,
    Composables
  > = {},
  CustomProps extends InPropsObject = {},
>(
  options: DefineResourceLayoutForResourcesOptions<
    [...BaseResources, ...ExtraResources],
    InProps,
    Composables,
    IncludeProps,
    CustomProps,
    ExtraResources
  >,
) => DefinedResourceLayout<
  [...BaseResources, ...ExtraResources],
  InProps,
  Composables,
  IncludeProps,
  CustomProps
>;

/**
 * Binds one or more resources, then accepts the remaining
 * {@link defineResourceLayout} options (with optional extra `resources`).
 */
export type DefineResourceLayoutForResources = <
  const Resources extends NonEmptyResourceDefinitions,
>(
  ...resources: Resources
) => DefineResourceLayoutForResourcesFactory<Resources>;

/**
 * Creates a resource layout definition for a set of resources.
 */
export type DefineResourceLayoutFn = {
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
  >(
    options: CreateViewMapOptions<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      CustomProps
    >,
  ): DefinedResourceLayout<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
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
  return ((options) => {
    const { resources: extraResources, ...rest } = options;
    const resources = extraResources
      ? [...baseResources, ...extraResources]
      : [...baseResources];

    return defineResourceLayoutImpl({
      ...rest,
      resources,
    } as never);
  }) as DefineResourceLayoutForResourcesFactory<Resources>;
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
> = {
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
    render?: LayoutDefinition<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps
    >['render'];
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
> = DefinedResourceLayout<
  Resources,
  Options,
  Composables,
  IncludeProps,
  CustomProps
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
export type DefineResourceLayoutWithLayoutFn = <
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
>(
  options: CreateResourceLayoutWithLayoutOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps,
    ShellComposables,
    ShellIncludeProps,
    ShellCustomProps
  >,
) => DefinedResourceLayoutWithShell<
  Resources,
  Options,
  Composables,
  IncludeProps,
  CustomProps,
  ShellComposables,
  ShellIncludeProps,
  ShellCustomProps
>;

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
