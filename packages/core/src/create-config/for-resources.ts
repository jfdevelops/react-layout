import {
  createContext,
  createElement,
  type JSX,
  type ReactNode,
  useContext,
} from 'react';
import type {
  ComposableComponents,
  ComposableResourceLayout,
} from '@jfdevelops/react-layout-composables';
import {
  type AnyBuiltPropDefinition,
  type ResolveProps,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import type {
  IncludedProps,
  InPropsDefinition,
  InPropsObject,
  MergedLayoutInProps,
  ResolvedIncludedProps,
} from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';
import { capitalize } from '../utils/capitalize';
import type { BaseComponent, Show } from '../utils';
import type {
  LayoutIncludeProps,
  LayoutPropsForResource,
  ResourceLayoutComponent,
} from './define-layout';
import type {
  CreatedLayoutForResource,
  CreateLayoutForResourceOptions,
  CreateResourceLayoutOptionsBase,
  SetDefaultPropForResourceFn,
} from './for-resource';

type CapitalizedResource<Resource extends string> = Resource extends Resource
  ? {
      toLowerCase: () => Lowercase<Capitalize<Resource>>;
    } & Capitalize<Resource>
  : never;

type ResourceLayoutName<
  Resource extends string,
  Name extends string = string,
> = Name | ((resource: CapitalizedResource<Resource>) => Name);

type ResourceLayoutNames<
  Resource extends string,
  CallbackName extends string = string,
> = {
  [TargetResource in Resource]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

type AtLeastOneResourceLayoutNameKey<Resource extends string> = {
  [TargetResource in Resource]: Record<TargetResource, unknown> &
    Partial<Record<Exclude<Resource, TargetResource>, unknown>>;
}[Resource];

type SelectedResourceLayoutNames<
  Resource extends string,
  SelectedResource extends Resource,
  CallbackName extends string,
> = {
  [TargetResource in Resource as TargetResource extends SelectedResource
    ? TargetResource
    : never]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

type ResourcesLayoutName<Resource extends string> =
  | Exclude<ResourceLayoutName<Resource>, string>
  | ResourceLayoutNames<Resource>;

type ResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string = string,
> = {
  [Resource in LayoutResourceKey<Resources>]?: {
    name?: string | ((resource: CapitalizedResource<Resource>) => CallbackName);
  };
};

type AtLeastOneResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string,
> = {
  [Resource in LayoutResourceKey<Resources>]: Required<
    Pick<ResourceLayoutSelection<Resources, CallbackName>, Resource>
  > &
    Omit<ResourceLayoutSelection<Resources, CallbackName>, Resource>;
}[LayoutResourceKey<Resources>];

type SelectedLayoutResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Arguments extends ReadonlyArray<unknown>,
> =
  Arguments extends ReadonlyArray<LayoutResourceKey<Resources>>
    ? Arguments[number]
    : Arguments[0] extends {
          resources: ReadonlyArray<infer Resource>;
        }
      ? Resource & LayoutResourceKey<Resources>
      : keyof Arguments[0] & LayoutResourceKey<Resources>;

type ResolveResourceLayoutName<Name> = Name extends (
  ...args: never[]
) => infer Result
  ? Result & string
  : Name extends string
    ? Name
    : string;

type NormalizeCapitalizedResourceName<
  Name extends string,
  Resource extends string,
> = Name extends Name
  ? NormalizeCapitalizedResourceNameMatch<Name, Resource> extends infer Match
    ? [Match] extends [never]
      ? Name
      : Match
    : never
  : never;

type NormalizeCapitalizedResourceNameMatch<
  Name extends string,
  Resource extends string,
> = Resource extends Resource
  ? Name extends `${CapitalizedResource<Resource>}${infer Suffix}`
    ? `${Capitalize<Resource>}${Suffix}`
    : never
  : never;

type SelectedResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? string
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name?: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? ResolveResourceLayoutName<Name>
          : Name extends Record<Resource, infer ResourceName>
            ? ResolveResourceLayoutName<ResourceName>
            : string
        : Options extends Record<Resource, infer ResourceOptions>
          ? ResourceOptions extends { name?: infer Name }
            ? ResolveResourceLayoutName<Name>
            : string
          : string
      : string;

type NormalizeResourceLayoutNames<Names, CallbackName extends string> = {
  [Resource in keyof Names]: Names[Resource] extends (
    ...args: never[]
  ) => unknown
    ? (
        resource: CapitalizedResource<Resource & string>,
      ) => NormalizeCapitalizedResourceName<CallbackName, Resource & string>
    : Names[Resource];
};

type NormalizeResourceLayoutSelection<Selection> = {
  [Resource in keyof Selection]: Selection[Resource] extends {
    name: infer Name;
  }
    ? {
        name: Name extends (...args: never[]) => unknown
          ? (
              resource: CapitalizedResource<Resource & string>,
            ) => NormalizeCapitalizedResourceName<
              ResolveResourceLayoutName<Name>,
              Resource & string
            >
          : Name;
      }
    : Selection[Resource];
};

type SharedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Name extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: (
      resource: CapitalizedResource<ResourceKeys[number]>,
    ) => NormalizeCapitalizedResourceName<Name, ResourceKeys[number]>;
  },
];

type MappedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Names,
  CallbackName extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: NormalizeResourceLayoutNames<Names, CallbackName>;
  },
];

type SelectedResourceLayoutArguments<Selection> = readonly [
  NormalizeResourceLayoutSelection<Selection>,
];

type HasResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? false
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? true
          : Name extends Record<Resource, unknown>
            ? true
            : false
        : Options extends Record<Resource, infer ResourceOptions>
          ? 'name' extends keyof ResourceOptions
            ? true
            : false
          : false
      : false;

type ScopedCreateResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  Name extends string,
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Props extends InPropsObject,
> = LayoutPropsForResource<Resources, InProps, Composables> & {
  resource: Resource;
  props?: Props;
} & (HasResourceLayoutName<Arguments, Resource> extends true
    ? { name?: Name }
    : { name: Name });

type ScopedCreateResourceLayoutFnImpl<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
  Props extends InPropsObject = {},
>(
  options: ScopedCreateResourceLayoutOptions<
    Resources,
    InProps,
    Composables,
    Arguments,
    Name,
    Resource,
    Props
  >,
) => ResourceLayoutComponent<Name, CustomProps, Composables, Resource>;

type ScopedCreateLayoutForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
>(
  options: CreateLayoutForResourceOptions<Resources, Name, Resource>,
) => CreatedLayoutForResource<
  Resources,
  InProps,
  Composables,
  Name,
  Resource,
  CustomProps
> & {
  setDefaults: SetDefaultPropForResourceFn<
    Resources,
    InProps,
    Composables,
    Name,
    Resource,
    CustomProps
  >;
};

type ScopedCreateResourceLayoutMakeComposableFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
  Props extends InPropsObject = {},
>(
  options: Omit<
    CreateResourceLayoutOptionsBase<Resources, Name, Resource>,
    'name'
  > &
    Partial<LayoutPropsForResource<Resources, InProps, Composables>> & {
      props?: Props;
    } & (HasResourceLayoutName<Arguments, Resource> extends true
      ? { name?: Name }
      : { name: Name }),
) => ComposableResourceLayout<Composables, Name, any, any, any>;

type ScopedComponentAvailableProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
> = MergedLayoutInProps<Resources, InProps, Composables> & LayoutCustomProps;

type ScopedResourceComponentProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
> = Show<
  Omit<
    ResolvedIncludedProps<
      ScopedComponentAvailableProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps
      >,
      ComponentIncludeProps
    > &
      ResolveProps<ComponentCustomProps>,
    'children' | 'resource'
  > & {
    children?: ReactNode;
    resource: Resource;
  }
>;

type ScopedTargetResourceComponent<Resource extends string> = {
  (props: any): JSX.Element;
  readonly resource: Resource;
};

type ScopedResourceComponentRenderOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
> = {
  [Resource in SelectedLayoutResources<Resources, Arguments>]?: {
    render: (
      props: ScopedResourceComponentProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentIncludeProps,
        ComponentCustomProps,
        Resource
      >,
    ) => JSX.Element;
  };
};

type ScopedResourceComponentRenderContext<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Arguments extends ReadonlyArray<unknown>,
> = {
  [Resource in SelectedLayoutResources<Resources, Arguments> as Capitalize<
    Resource
  >]: () => JSX.Element;
};

type ScopedResourceComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
> = BaseComponent<
  string,
  ScopedResourceComponentProps<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    SelectedLayoutResources<Resources, Arguments>
  >
> & {
  <
    const ResourceComponent extends ScopedTargetResourceComponent<
      SelectedLayoutResources<Resources, Arguments>
    > = ScopedTargetResourceComponent<
      SelectedLayoutResources<Resources, Arguments>
    >,
  >(
    props: ScopedResourceComponentProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      ResourceComponent['resource']
    >,
  ): JSX.Element;
};

type ScopedCreateComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
> = <
  const ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  > = {},
  ComponentCustomProps extends InPropsObject = {},
>(options: {
  props?: {
    /** Props from the resource layout definition to expose to the component. */
    include?: ComponentIncludeProps;
    /** Additional props accepted by the component. */
    custom?: ComponentCustomProps;
  };
  /**
   * Renders the scoped component. `children` and `resource` are always
   * available. The context contains capitalized components for the selected
   * resources.
   */
  render: (
    props: ScopedResourceComponentProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      SelectedLayoutResources<Resources, Arguments>
    >,
    context: ScopedResourceComponentRenderContext<Resources, Arguments>,
  ) => JSX.Element;
} &
  ScopedResourceComponentRenderOptions<
    Resources,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps
  >) => ScopedResourceComponent<
  Resources,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  ComponentIncludeProps,
  ComponentCustomProps
>;

type ScopedCreateResourceLayoutFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = ScopedCreateResourceLayoutFnImpl<
  Resources,
  InProps,
  Composables,
  Arguments,
  CustomProps
> & {
  /**
   * Creates a component shared by the target resources. Included layout props
   * become component props, and `children` is always available as an optional
   * prop in both the render callback and at the call site.
   *
   * @example
   * const Directory = createDirectoryLayout.createComponent({
   *   props: { include: { title: true, actions: 'optional' } },
   *   users: {
   *     render: ({ resource }) => <span>{resource}</span>,
   *   },
   *   render: ({ actions, children, resource, title }, context) => {
   *     const ResourceRender = context.Users
   *
   *     return (
   *       <Page resource={resource} title={title} actions={actions}>
   *         {children}
   *         <ResourceRender />
   *       </Page>
   *     )
   *   },
   * })
   *
   * <Directory<typeof UsersPage> resource='users' title='Users' />
   *
   * @param options The props configuration and component render function.
   * @returns A component scoped to the selected resources.
   */
  createComponent: ScopedCreateComponent<
    Resources,
    InProps,
    Composables,
    Arguments,
    CustomProps
  >;
  forResource: ScopedCreateLayoutForResource<
    Resources,
    InProps,
    Composables,
    Arguments,
    CustomProps
  >;
  /**
   * Type-only property containing the target resource union. This property is
   * `undefined` at runtime and exists solely for extracting the scoped type.
   *
   * @example
   * type AccountResource = typeof createAccountLayout.resources;
   */
  readonly resources: SelectedLayoutResources<Resources, Arguments>;
} & ([keyof Composables] extends [never]
    ? {}
    : {
        makeComposable: ScopedCreateResourceLayoutMakeComposableFn<
          Resources,
          InProps,
          Composables,
          Arguments
        >;
      });

export type CreateResourceLayoutForResourcesFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * Creates a layout factory scoped to the listed resources.
   *
   * Layout names must be supplied when a layout is created.
   *
   * @example
   * createResourceLayout.forResources('users', 'admins')
   *
   * @param resources Resources available from the returned layout factory.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends readonly [
      LayoutResourceKey<Resources>,
      ...Array<LayoutResourceKey<Resources>>,
    ],
  >(
    ...resources: ResourceKeys
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    ResourceKeys,
    CustomProps
  >;

  /**
   * Creates a layout factory scoped to a resource list without default names.
   *
   * @example
   * createResourceLayout.forResources({ resources: ['users', 'admins'] })
   *
   * @param options The resources to expose without configured default names.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  >(options: {
    resources: ResourceKeys;
    name?: never;
  }): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    readonly [{ resources: ResourceKeys }],
    CustomProps
  >;

  /**
   * Creates a scoped layout factory with optional default names per resource.
   *
   * Each map key is limited to the resources selected in `resources`. Values
   * can be strings or callbacks receiving that resource's capitalized name.
   *
   * @example
   * createResourceLayout.forResources({
   *   resources: ['users', 'admins'],
   *   name: {
   *     users: resource => `${resource}Page`,
   *     admins: 'AdminDirectory',
   *   },
   * })
   *
   * @param options The selected resources and their optional default names.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
    const CallbackName extends string,
    const Names,
  >(
    options: {
      resources: ResourceKeys;
      name: SelectedResourceLayoutNames<
        LayoutResourceKey<Resources>,
        NoInfer<ResourceKeys[number]>,
        CallbackName
      > &
        AtLeastOneResourceLayoutNameKey<NoInfer<ResourceKeys[number]>> &
        Record<
          string,
          NonNullable<
            ResourceLayoutNames<
              LayoutResourceKey<Resources>,
              CallbackName
            >[LayoutResourceKey<Resources>]
          >
        >;
    } & {
      name: Names & Record<Exclude<keyof Names, ResourceKeys[number]>, never>;
    },
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    MappedResourceLayoutArguments<Resources, ResourceKeys, Names, CallbackName>,
    CustomProps
  >;

  /**
   * Creates a scoped layout factory with one default-name callback shared by
   * every selected resource. The callback receives a capitalized resource
   * whose `toLowerCase()` result retains the corresponding literal type.
   *
   * @example
   * createResourceLayout.forResources({
   *   resources: ['users', 'admins'],
   *   name: resource => `${resource}Page`,
   * })
   *
   * @param options The selected resources and shared default-name callback.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
    const Name extends string,
  >(
    options: {
      resources: ReadonlyArray<LayoutResourceKey<Resources>>;
      name: (resource: CapitalizedResource<ResourceKeys[number]>) => Name;
    } & { resources: ResourceKeys },
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    SharedResourceLayoutArguments<Resources, ResourceKeys, Name>,
    CustomProps
  >;

  /**
   * Creates a scoped layout factory from a resource-keyed configuration.
   * Only configured resources are available from the returned factory.
   *
   * @example
   * createResourceLayout.forResources({
   *   users: { name: resource => `${resource}Page` },
   *   admins: { name: 'AdminDirectory' },
   * })
   *
   * @param options Resource-keyed layout defaults.
   * @returns A layout factory scoped to the configured resources.
   */
  <
    const CallbackName extends string,
    const Selection extends ResourceLayoutSelection<Resources, CallbackName>,
  >(
    options: Selection &
      AtLeastOneResourceLayoutSelection<Resources, CallbackName> &
      Partial<
        Record<Exclude<'resources', LayoutResourceKey<Resources>>, never>
      > &
      Record<Exclude<keyof Selection, LayoutResourceKey<Resources>>, never>,
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    SelectedResourceLayoutArguments<Selection>,
    CustomProps
  >;
};

type CreateForResourcesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  createLayoutForResource: (
    defaultName: string | undefined,
    resource: LayoutResourceKey<Resources>,
  ) => unknown;
  createMakeComposableLayout?: () => (
    options: Record<string, unknown>,
  ) => unknown;
  createResourceLayout: (options: Record<string, unknown>) => unknown;
  getComponentPropDefinitions: (
    resource: LayoutResourceKey<Resources>,
  ) => Record<string, AnyBuiltPropDefinition>;
};

export function createForResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
>({
  createLayoutForResource,
  createMakeComposableLayout,
  createResourceLayout,
  getComponentPropDefinitions,
}: CreateForResourcesOptions<Resources>) {
  return ((...resourcesOrOptions: Array<unknown>) => {
    const firstArgument = resourcesOrOptions[0];
    let resourceOptions: Array<{
      resource: LayoutResourceKey<Resources>;
      name?:
        | string
        | ((
            resource: CapitalizedResource<LayoutResourceKey<Resources>>,
          ) => string);
    }>;

    if (typeof firstArgument === 'string') {
      resourceOptions = resourcesOrOptions.map((resource) => ({
        resource: resource as LayoutResourceKey<Resources>,
      }));
    } else if (
      firstArgument !== null &&
      typeof firstArgument === 'object' &&
      'resources' in firstArgument &&
      Array.isArray(firstArgument.resources)
    ) {
      const { name, resources } = firstArgument as {
        name?: ResourcesLayoutName<LayoutResourceKey<Resources>>;
        resources: Array<LayoutResourceKey<Resources>>;
      };
      resourceOptions = resources.map((resource) => ({
        name: typeof name === 'function' ? name : name?.[resource],
        resource,
      }));
    } else {
      resourceOptions = Object.entries(firstArgument ?? {}).map(
        ([resource, options]) => ({
          ...(options as {
            name?:
              | string
              | ((
                  resource: CapitalizedResource<LayoutResourceKey<Resources>>,
                ) => string);
          }),
          resource: resource as LayoutResourceKey<Resources>,
        }),
      );
    }

    const defaultNames = new Map(
      resourceOptions.map(({ name, resource }) => [
        resource,
        typeof name === 'function'
          ? name(
              capitalize(resource) as CapitalizedResource<
                LayoutResourceKey<Resources>
              >,
            )
          : name,
      ]),
    );

    function scopedCreateResourceLayout(options: Record<string, unknown>) {
      const resource = options.resource as LayoutResourceKey<Resources>;

      return createResourceLayout({
        ...options,
        name: options.name ?? defaultNames.get(resource),
      });
    }

    function scopedForResource(options: {
      name?: string;
      resource: LayoutResourceKey<Resources>;
    }) {
      return createLayoutForResource(
        options.name ?? defaultNames.get(options.resource),
        options.resource,
      );
    }

    function createComponent(componentOptions: {
      [resource: string]: unknown;
      props?: {
        include?: Record<string, true | 'optional'>;
        custom?: Record<string, AnyBuiltPropDefinition>;
      };
      render: (
        props: Record<string, unknown>,
        context: Record<string, () => JSX.Element>,
      ) => JSX.Element;
    }) {
      const include = componentOptions.props?.include ?? {};
      const custom = componentOptions.props?.custom ?? {};
      const selectedResources = new Set(
        resourceOptions.map(({ resource }) => resource),
      );
      const componentPropsContext = createContext<
        Record<string, unknown> | undefined
      >(undefined);
      const contextResources = new Map<string, LayoutResourceKey<Resources>>();
      const renderContext = Object.fromEntries(
        resourceOptions.map(({ resource }) => {
          const contextKey = capitalize(resource);
          const existingResource = contextResources.get(contextKey);

          if (existingResource !== undefined) {
            throw new Error(
              `Resources "${existingResource}" and "${resource}" both map to render context key "${contextKey}"`,
            );
          }

          contextResources.set(contextKey, resource);

          const resourceRenderOptions = componentOptions[resource] as
            | {
                render: (props: Record<string, unknown>) => JSX.Element;
              }
            | undefined;

          function ResourceRender() {
            const componentProps = useContext(componentPropsContext);

            if (componentProps === undefined) {
              throw new Error(
                `Render context component "${contextKey}" must be rendered inside its scoped component`,
              );
            }

            return resourceRenderOptions?.render({
              ...componentProps,
              resource,
            }) ?? (null as unknown as JSX.Element);
          }

          return [contextKey, ResourceRender];
        }),
      );

      function Component(componentProps: Record<string, unknown>) {
        const componentResource =
          componentProps.resource as LayoutResourceKey<Resources>;

        if (!selectedResources.has(componentResource)) {
          throw new Error(
            `Resource "${componentResource}" is not available in this scoped component`,
          );
        }

        const availableDefinitions =
          getComponentPropDefinitions(componentResource);
        const definitionsToValidate: Record<string, AnyBuiltPropDefinition> =
          {};

        for (const [key, inclusion] of Object.entries(include)) {
          const definition = availableDefinitions[key];

          if (!definition) {
            continue;
          }

          const propKey =
            'type' in definition && definition.type === 'JSX.Element'
              ? capitalize(key)
              : key;

          if (inclusion === true || propKey in componentProps) {
            definitionsToValidate[propKey] = definition;
          }
        }

        for (const [key, definition] of Object.entries(custom)) {
          if (key === 'children' || key === 'resource') {
            continue;
          }

          const propKey =
            'type' in definition && definition.type === 'JSX.Element'
              ? capitalize(key)
              : key;
          definitionsToValidate[propKey] = definition;
        }

        validateProps(definitionsToValidate, componentProps);

        return createElement(
          componentPropsContext.Provider,
          { value: componentProps },
          componentOptions.render(componentProps, renderContext),
        );
      }

      return Object.assign(Component, {
        displayName: 'ScopedResourceComponent',
        props: undefined,
      });
    }

    const scopedExtras: {
      createComponent: typeof createComponent;
      forResource: typeof scopedForResource;
      makeComposable?: (options: Record<string, unknown>) => unknown;
      resources: undefined;
    } = {
      createComponent,
      forResource: scopedForResource,
      resources: undefined,
    };

    if (createMakeComposableLayout) {
      const makeComposableLayout = createMakeComposableLayout();

      scopedExtras.makeComposable = (options) => {
        const resource = options.resource as LayoutResourceKey<Resources>;

        return makeComposableLayout({
          ...options,
          name: options.name ?? defaultNames.get(resource),
        });
      };
    }

    return Object.assign(scopedCreateResourceLayout, scopedExtras);
  }) as unknown as CreateResourceLayoutForResourcesFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
}
