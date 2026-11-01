import { inspectLazy } from '../lazy/inspection';
import type { ResourcePath } from '../resource';
import { createLazyRenderStateBuilder, type CreateLazyRenderState, type CreateBoundLazyErrorComponent } from '../lazy/create-render-state';
import { lazyDefaultsSymbol } from '../lazy/types';
import type { LazyResourceError } from '../errors/lazy-resource-error';
import {
  getLayoutDebug,
  layoutDebug,
  createInspectionStore,
  layoutInspection,
  getInspectionSource,
} from '@jfdevelops/react-layout-devtools-core';
import { mergeLayoutProps } from './merge-layout-props';
import type { LayoutNameInput } from './layout-name';
import type { MergeContract } from './define-layout';
import type {
  ComposableComponents,
  CreateLayoutComposable,
} from '@jfdevelops/react-layout-composables';
import { LayoutConfigurationError } from '../errors';
import type { InPropsDefinition, InPropsObject } from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';
import {
  type CreateViewMapFunctionRenderOptions,
  type DefinedResourceLayout,
  defineResourceLayout,
  type LayoutIncludeProps,
  type LayoutResourcesAccessor,
  type CreateViewMapRenderStatesOptions,
  type DefinedResourceLayoutFromStates,
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
  type RenderStateContext,
  type RenderStateReferences,
  type LayoutComposablesDefinition,
} from './render-state';

/** A resource tuple with at least one entry, preserving literal and nested paths. */
export type NonEmptyResources = readonly [
  ResourceDefinition,
  ...ResourceDefinition[]
];

/** Configuration shared by every layout created from one defined-layout factory. */
export type CreateDefinedResourceLayoutOptions<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  DefaultNamespace extends boolean = false,
  SharedInclude extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  > = {},
  SharedCustom extends InPropsObject = {},
  DefaultNaming extends
    | LayoutNameInput<LayoutResourceKey<Resources>>
    | undefined = undefined
> = {
  namespace?: DefaultNamespace;
  /** Default naming convention; explicit definition and component names override it. */
  name?: DefaultNaming;
  /** Shared prop contracts, merged by key with layout and state contracts. */
  props?: {
    include?: LayoutIncludeProps<Resources, Options, Composables> & SharedInclude;
    custom?: SharedCustom;
  };
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
  Namespace extends boolean = false
> = Omit<
  CreateViewMapFunctionRenderOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >['layout'],
  'composables' | 'render'
> & { render: Render; namespace?: Namespace };

type BoundLayoutComposables<
  Shared extends ComposableComponents,
  Local extends ComposableComponents
> = Omit<Shared, keyof Local> & Local;

/** Flattens a definition's layout while preserving its namespace setting. */
type BoundLayoutInput<
  Definition extends { layout: unknown; namespace?: boolean }
> = Definition['layout'] &
  Pick<Definition, 'namespace'> &
  (Definition extends { name?: infer Name } ? { name?: Name } : {});

/** A `defineResourceLayout` function with its shared configuration pre-bound. */
export type BoundDefineResourceLayout<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  DefaultNamespace extends boolean = false,
  SharedInclude extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  > = {},
  SharedCustom extends InPropsObject = {},
  DefaultNaming extends
    | LayoutNameInput<LayoutResourceKey<Resources>>
    | undefined = undefined
> = {
  /**
   * Defines a layout whose `render` map contains the required `default` state
   * and any built-in or custom compound component states.
   * Keep this overload first so incomplete render objects suggest state keys.
   * Use `createRenderState` for state-local `composables(create)` callbacks;
   * the helper infers their render context independently of the enclosing map.
   */
  <
    const Render extends { default: unknown } & Record<string, unknown>,
    LocalComposables extends ComposableComponents = {},
    Namespace extends boolean = DefaultNamespace,
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      BoundLayoutComposables<Composables, LocalComposables>
    > = {},
    CustomProps extends InPropsObject = {},
    const Naming extends
      | LayoutNameInput<
          LayoutResourceKey<Resources>,
          ('default' | keyof Render) & string
        >
      | undefined = DefaultNaming
  >(
    layout: Omit<
      BoundLayoutInput<
        CreateViewMapRenderStatesOptions<
          Resources,
          Options,
          BoundLayoutComposables<Composables, LocalComposables>,
          MergeContract<SharedInclude, IncludeProps>,
          MergeContract<SharedCustom, CustomProps>,
          Render,
          Namespace
        >
      >,
      'composables' | 'name' | 'props'
    > & {
      name?: Naming;
      props?: {
        include?: LayoutIncludeProps<
          Resources,
          Options,
          BoundLayoutComposables<Composables, LocalComposables>
        > & IncludeProps;
        custom?: CustomProps;
      };
      composables?: (
        create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
        states: RenderStateReferences<Resources, Options, Composables, Render>
      ) => LocalComposables;
    }
  ): DefinedResourceLayoutFromStates<
    Resources,
    Options,
    BoundLayoutComposables<Composables, LocalComposables>,
    Render,
    Namespace,
    MergeContract<SharedInclude, IncludeProps>,
    MergeContract<SharedCustom, CustomProps>,
    Naming
  >;
  /** Defines a layout whose `render` value is a single default-state callback. */
  <
    const IncludeProps extends LayoutIncludeProps<
      Resources,
      Options,
      BoundLayoutComposables<Composables, LocalComposables>
    > = {},
    CustomProps extends InPropsObject = {},
    LocalComposables extends ComposableComponents = {},
    Namespace extends boolean = DefaultNamespace,
    const Naming extends
      | LayoutNameInput<LayoutResourceKey<Resources>, 'default'>
      | undefined = DefaultNaming
  >(
    layout: Omit<
      BoundLayoutInput<
        CreateViewMapFunctionRenderOptions<
          Resources,
          Options,
          BoundLayoutComposables<Composables, LocalComposables>,
          MergeContract<SharedInclude, IncludeProps>,
          MergeContract<SharedCustom, CustomProps>,
          Namespace
        >
      >,
      'composables' | 'name' | 'props'
    > & {
      name?: Naming;
      props?: {
        include?: LayoutIncludeProps<
          Resources,
          Options,
          BoundLayoutComposables<Composables, LocalComposables>
        > & IncludeProps;
        custom?: CustomProps;
      };
      composables?: (
        create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
        states: {}
      ) => LocalComposables;
    }
  ): DefinedResourceLayout<
    Resources,
    Options,
    BoundLayoutComposables<Composables, LocalComposables>,
    MergeContract<SharedInclude, IncludeProps>,
    MergeContract<SharedCustom, CustomProps>,
    {},
    Namespace,
    Naming
  >;
  /**
   * Creates a lazy proxy for the single library-defined component exported by
   * a resource module.
   *
   * @param options - Resource path and named-module import callback.
   */
  lazy<Module extends Record<string, unknown>>(
    options: LazyResourceLayoutOptions<Resources, Module>
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>>;
};

/** Registers loading and module-error components used by lazy layouts. */
export type DefineLazyDefaults<
  Resource = string,
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources> = {},
  Composables extends ComposableComponents = {},
> = {
  /**
   * Sets defaults before the first lazy layout. Development reloads may replace them.
   *
   * @param defaults - Shared components for pending module loads and failures.
   */
  (defaults: LazyResourceStates<Resource>): void;
  readonly errors: LazyResourceError;
  createRenderState: CreateLazyRenderState<Resources, Options, Composables>;
  /** @deprecated Use createRenderState({ state: 'Error', render }) instead. */
  createErrorComponent: CreateBoundLazyErrorComponent<Resource, RenderStateContext<Composables, Resources, 'Error'>>;
};

/** Reusable helpers produced by {@link createDefinedResourceLayout}. */
export type CreateDefinedResourceLayoutResult<
  Resources extends NonEmptyResources,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  DefaultNamespace extends boolean = false,
  SharedInclude extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  > = {},
  SharedCustom extends InPropsObject = {},
  DefaultNaming extends
    | LayoutNameInput<LayoutResourceKey<Resources>>
    | undefined = undefined
> = {
  /** Creates eager, deferred, or separately imported render-state fragments. */
  createRenderState: CreateRenderState<
    Resources,
    Options,
    Composables,
    SharedInclude,
    SharedCustom
  >;
  /** Sets the shared loading and module-error UI used by lazy layouts. */
  defineLazyDefaults: DefineLazyDefaults<ResourcePath<Resources>, Resources, Options, Composables>;
  /** Defines a layout using the resources, options, and composables already bound. */
  defineResourceLayout: BoundDefineResourceLayout<
    Resources,
    Options,
    Composables,
    DefaultNamespace,
    SharedInclude,
    SharedCustom,
    DefaultNaming
  >;
  /** Reads, selects, or validates the resources bound to this factory. */
  resources: LayoutResourcesAccessor<Resources>;
};

/**
 * A configuration that may omit its name cannot guarantee a naming default.
 */
type DefinedFactoryNaming<Naming> = undefined extends Naming ? undefined : Naming;

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
  DefaultNamespace extends boolean = false,
  const SharedInclude extends object = {},
  const SharedCustom extends InPropsObject = {},
  const DefaultNaming extends
    | LayoutNameInput<LayoutResourceKey<Resources>>
    | undefined = LayoutNameInput<LayoutResourceKey<Resources>> | undefined
>(
  configuration: CreateDefinedResourceLayoutOptions<
    Resources,
    Options,
    Composables,
    DefaultNamespace,
    SharedInclude,
    SharedCustom,
    DefaultNaming
  >
): CreateDefinedResourceLayoutResult<
  Resources,
  Options,
  Composables,
  DefaultNamespace,
  SharedInclude,
  SharedCustom,
  DefinedFactoryNaming<DefaultNaming>
> {
  const { resources, options = {} as Options, composables } = configuration;
  const defineBoundLayout = defineResourceLayout.forResources(...resources);
  const inspection = createInspectionStore();
  let lazyDefaults: LazyResourceStates<ResourcePath<Resources>> = {};
  let lazyDefaultsDefined = false;
  let lazyLayoutCreated = false;

  function defineLazyDefaults(
    defaults: LazyResourceStates<ResourcePath<Resources>>
  ): void {
    const replacingInDevelopment = lazyDefaultsDefined && process.env.NODE_ENV !== 'production';
    if (lazyDefaultsDefined && !replacingInDevelopment) {
      throw new LayoutConfigurationError(
        'Lazy resource defaults can only be defined once.'
      );
    }

    if (lazyLayoutCreated && !replacingInDevelopment) {
      throw new LayoutConfigurationError(
        'Lazy resource defaults must be defined before creating a lazy resource layout.'
      );
    }

    lazyDefaults = defaults;

    lazyDefaultsDefined = true;
  }

  Object.defineProperty(defineLazyDefaults, 'errors', {
    value: undefined,
    enumerable: false,
  });
  defineLazyDefaults.createRenderState = createLazyRenderStateBuilder({ resources, options, composables });
  defineLazyDefaults.createErrorComponent = ((render: any) =>
    defineLazyDefaults.createRenderState({ state: 'Error', render })
  ) as CreateBoundLazyErrorComponent<ResourcePath<Resources>, RenderStateContext<Composables, Resources, 'Error'>>;

  const boundDefineResourceLayout = ((layout: Record<string, unknown>) => {
    const localComposables = layout.composables as
      | LayoutComposablesDefinition<Resources, ComposableComponents>
      | undefined;
    const definition = defineBoundLayout({
      [lazyDefaultsSymbol]: () => lazyDefaults,
      [layoutDebug]: getLayoutDebug(layout) ?? getLayoutDebug(configuration),
      options,
      name: layout.name ?? configuration.name,
      namespace: layout.namespace ?? configuration.namespace,
      layout: {
        ...layout,
        props: mergeLayoutProps(
          configuration.props,
          layout.props as { include?: object; custom?: object }
        ),
        composables:
          composables || localComposables
            ? (
                create: CreateLayoutComposable<LayoutResourceKey<Resources>>,
                states: {}
              ) => ({
                ...composables?.(create, states),
                ...localComposables?.(create, states),
              })
            : undefined,
      },
    } as never);

    inspection.connect(definition);

    return definition;
  }) as unknown as BoundDefineResourceLayout<
    Resources,
    Options,
    Composables,
    DefaultNamespace,
    SharedInclude,
    SharedCustom,
    DefinedFactoryNaming<DefaultNaming>
  >;

  boundDefineResourceLayout.lazy = <Module extends Record<string, unknown>>(
    lazyOptions: LazyResourceLayoutOptions<Resources, Module>
  ): ReturnType<typeof createLazyResourceLayout<Resources, Module>> => {
    lazyLayoutCreated = true;

    const label = (lazyOptions as unknown as { resource: string }).resource;
    const lazyInspection = inspectLazy(label, inspection);
    const id = lazyInspection.id;

    return createLazyResourceLayout(
      {
        ...lazyOptions,
        load: async () => {
          const module: Record<string, unknown> = await lazyOptions.load();

          for (const entry of Object.values(module)) {
            const component =
              entry && typeof entry === 'object' && 'Root' in entry
                ? entry.Root
                : entry;

            if (
              ((typeof component === 'object' && component !== null) ||
                typeof component === 'function') &&
              layoutInspection in component
            ) {
              inspection.connect(component);

              const target = getInspectionSource(component)
                .getSnapshot()
                .nodes.find(
                  (n) =>
                    n.kind === 'layout' &&
                    n.label ===
                      (component as { displayName?: string }).displayName
                );

              if (target) inspection.edge(id, target.id, 'references');
            }
          }

          return module as Module;
        },
      },
      () => lazyDefaults,
      lazyInspection.hooks
    );
  };

  return inspection.attach({
    createRenderState: createRenderStateBuilder(
      {
        props: configuration.props,
        composables,
        options,
        resources,
      },
      {
        store: inspection,
        defaults: () => lazyDefaults as LazyResourceStates,
        onLazy: () => {
          lazyLayoutCreated = true;
        },
      }
    ),
    defineLazyDefaults: defineLazyDefaults as DefineLazyDefaults<
      ResourcePath<Resources>, Resources, Options, Composables
    >,
    defineResourceLayout: boundDefineResourceLayout,
    resources: createLayoutResourcesAccessor(resources),
  });
}
